import { Groq } from 'groq-sdk'

let groq = null

const DEFAULT_PDF_PRIMARY_PROVIDER = 'groq'
const DEFAULT_PDF_PRIMARY_MODEL = 'llama-3.3-70b-versatile'
const DEFAULT_PDF_FALLBACK_PROVIDER = 'gemini'
const DEFAULT_PDF_FALLBACK_MODEL = 'gemma-4-31b-it'
const DEFAULT_QUIZ_PROVIDER = 'gemini'
const DEFAULT_QUIZ_MODEL = 'gemma-4-31b-it'
const DEFAULT_CONCEPT_PROVIDER = 'gemini'
const DEFAULT_CONCEPT_MODEL = 'gemma-4-31b-it'
const DEFAULT_CHAT_PROVIDER = 'groq'
const DEFAULT_CHAT_MODEL = 'llama-3.1-8b-instant'
const DEFAULT_REQUEST_TIMEOUT_MS = 45000
const DEFAULT_ERROR_MESSAGE = 'AI processing is temporarily unavailable. Please try again in a few minutes.'

export class AIModelError extends Error {
  constructor(message, details = {}) {
    super(message)
    this.name = 'AIModelError'
    this.status = details.status || 503
    this.details = details
  }
}

export const AI_USER_FRIENDLY_ERROR = DEFAULT_ERROR_MESSAGE

const getConfiguredModels = () => ({
  pdfPrimary: {
    provider: process.env.PDF_PRIMARY_PROVIDER || DEFAULT_PDF_PRIMARY_PROVIDER,
    model: process.env.PDF_PRIMARY_MODEL || process.env.SUMMARY_MODEL || DEFAULT_PDF_PRIMARY_MODEL,
  },
  pdfFallback: {
    provider: process.env.PDF_FALLBACK_PROVIDER || DEFAULT_PDF_FALLBACK_PROVIDER,
    model: process.env.PDF_FALLBACK_MODEL || DEFAULT_PDF_FALLBACK_MODEL,
  },
  quiz: {
    provider: process.env.QUIZ_PROVIDER || DEFAULT_QUIZ_PROVIDER,
    model: process.env.QUIZ_MODEL || DEFAULT_QUIZ_MODEL,
  },
  concept: {
    provider: process.env.CONCEPT_PROVIDER || DEFAULT_CONCEPT_PROVIDER,
    model: process.env.CONCEPT_MODEL || DEFAULT_CONCEPT_MODEL,
  },
  chat: {
    provider: process.env.CHAT_PROVIDER || DEFAULT_CHAT_PROVIDER,
    model: process.env.CHAT_MODEL || DEFAULT_CHAT_MODEL,
  },
})

const getRequestTimeout = () => {
  const configuredTimeout = Number(process.env.AI_REQUEST_TIMEOUT_MS)
  return Number.isFinite(configuredTimeout) && configuredTimeout > 0
    ? configuredTimeout
    : DEFAULT_REQUEST_TIMEOUT_MS
}

const getErrorSummary = (error) => {
  const status = error?.status || error?.code || 'unknown'
  const message = error?.message || 'Unknown error'
  return `status=${status}; message=${message}`
}

const getGroqClient = () => {
  if (!process.env.GROQ_API_KEY) {
    throw new AIModelError('GROQ_API_KEY is not configured', {
      reason: 'missing-api-key',
      status: 500,
    })
  }

  if (!groq) {
    groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
      timeout: getRequestTimeout(),
      maxRetries: 1,
    })
  }

  return groq
}

const messagesToPrompt = (messages = []) => {
  return messages
    .map((message) => `${message.role}: ${message.content}`)
    .join('\n\n')
}

const readGroqCompletionText = (completion) => {
  const response = completion.choices?.[0]?.message?.content
  if (!response) {
    throw new Error('Groq returned an empty completion')
  }

  return response
}

const readGeminiCompletionText = (data) => {
  const response = data?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text)
    .filter(Boolean)
    .join('\n')

  if (!response) {
    throw new Error('Gemini returned an empty completion')
  }

  return response
}

const logRawAIResponse = (taskName, response) => {
  console.log(`[AI:${taskName}] Raw response start`)
  console.log(response)
  console.log(`[AI:${taskName}] Raw response end`)
}

const createGroqCompletion = async ({ taskName, content, maxTokens, model, messages }) => {
  const groqClient = getGroqClient()

  console.log(`[AI:${taskName}] Request started with provider=groq model=${model}`)
  const completion = await groqClient.chat.completions.create({
    model,
    max_tokens: maxTokens,
    messages: messages || [
      {
        role: 'user',
        content,
      },
    ],
  }, {
    timeout: getRequestTimeout(),
  })

  const response = readGroqCompletionText(completion)
  console.log(`[AI:${taskName}] Request completed with provider=groq model=${model}`)
  return response
}

const createGeminiCompletion = async ({ taskName, content, maxTokens, model, messages }) => {
  if (!process.env.GEMINI_API_KEY) {
    throw new AIModelError('GEMINI_API_KEY is not configured', {
      reason: 'missing-api-key',
      status: 500,
    })
  }

  if (typeof fetch !== 'function') {
    throw new AIModelError('Global fetch is not available. Please run the backend on Node 18 or newer.', {
      reason: 'fetch-unavailable',
      status: 500,
    })
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), getRequestTimeout())
  const prompt = content || messagesToPrompt(messages)
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`

  try {
    console.log(`[AI:${taskName}] Request started with provider=gemini model=${model}`)
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': process.env.GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          maxOutputTokens: maxTokens,
        },
      }),
      signal: controller.signal,
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      const message = data?.error?.message || `Gemini API returned HTTP ${response.status}`
      const error = new Error(message)
      error.status = response.status
      throw error
    }

    const output = readGeminiCompletionText(data)
    console.log(`[AI:${taskName}] Request completed with provider=gemini model=${model}`)
    return output
  } catch (error) {
    if (error?.name === 'AbortError') {
      const timeoutError = new Error(`Gemini request timed out after ${getRequestTimeout()}ms`)
      timeoutError.status = 408
      throw timeoutError
    }

    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

const createCompletion = async ({ provider, taskName, content, maxTokens, model, messages }) => {
  if (provider === 'groq') {
    return createGroqCompletion({ taskName, content, maxTokens, model, messages })
  }

  if (provider === 'gemini') {
    return createGeminiCompletion({ taskName, content, maxTokens, model, messages })
  }

  throw new AIModelError(`Unsupported AI provider: ${provider}`, {
    reason: 'unsupported-provider',
    provider,
    status: 500,
  })
}

const normalizeRoute = (route) => {
  if (typeof route === 'string') {
    return {
      provider: 'groq',
      model: route,
    }
  }

  return {
    provider: route.provider,
    model: route.model,
  }
}

const getRouteKey = (route) => `${route.provider}:${route.model}`

const createCompletionWithFallback = async ({ taskName, content, maxTokens, routes, messages, failureMessage = DEFAULT_ERROR_MESSAGE }) => {
  const fallbackRoutes = []
  const seenRoutes = new Set()

  for (const rawRoute of routes) {
    const route = normalizeRoute(rawRoute)
    if (!route.provider || !route.model) continue

    const routeKey = getRouteKey(route)
    if (!seenRoutes.has(routeKey)) {
      seenRoutes.add(routeKey)
      fallbackRoutes.push(route)
    }
  }

  const attemptedRoutes = []
  let lastError = null

  for (const route of fallbackRoutes) {
    attemptedRoutes.push(getRouteKey(route))

    try {
      const response = await createCompletion({
        provider: route.provider,
        taskName,
        content,
        maxTokens,
        model: route.model,
        messages,
      })

      return {
        response,
        provider: route.provider,
        model: route.model,
      }
    } catch (error) {
      lastError = error
      console.warn(`[AI:${taskName}] Request failed with provider=${route.provider} model=${route.model}: ${getErrorSummary(error)}`)

      if (attemptedRoutes.length < fallbackRoutes.length) {
        const nextRoute = fallbackRoutes[attemptedRoutes.length]
        console.warn(`[AI:${taskName}] Falling back from provider=${route.provider} model=${route.model} to provider=${nextRoute.provider} model=${nextRoute.model}`)
      }
    }
  }

  throw new AIModelError(failureMessage, {
    taskName,
    attemptedRoutes,
    cause: lastError,
  })
}

export const generateSummary = async (text) => {
  const models = getConfiguredModels()
  const result = await createCompletionWithFallback({
    taskName: 'pdf-summary',
    content: `Create an exam-friendly study summary from the material below.

Return 250-400 words maximum.
Use ONLY this format:

Topic: <main topic>

Key Points:
- <important point>
- <important point>
- <important point>
- <important point>

Important Concepts:
- <concept>
- <concept>
- <concept>

Exam Focus:
- <likely exam question or comparison>
- <likely exam question or application>
- <likely exam question or definition>

Quick Revision:
<2-3 short sentences that students can revise quickly>

Rules:
- No giant paragraphs.
- Use short bullets and student-friendly language.
- Focus on definitions, differences, examples, applications, and exam-relevant facts.
- Do not copy long passages from the input.
- Do not include prompt labels such as Input, Task, or Format.

Study material:
${text}`,
    maxTokens: 1024,
    routes: [models.pdfPrimary, models.pdfFallback],
  })

  return result.response
}

export const generateKeyConcepts = async (text) => {
  const models = getConfiguredModels()
  const { response, provider, model } = await createCompletionWithFallback({
    taskName: 'concept-generation',
    content: `You are a JSON-only study concept extractor.

Extract the 5-8 most important concepts from the study material.

Return ONLY a valid JSON array. Do not include any extra text before or after the JSON.
Each item must have this exact shape:
{
  "title": "Short concept title",
  "explanation": "Brief explanation in one or two plain text sentences."
}

Content rules:
- Include only actual study concepts from the material.
- Never include prompt labels, validation notes, implementation notes, or instruction words.
- Never include phrases such as "Check against constraints", "Ensure", "strict JSON", "JSON array", "prompt labels", or "markdown".
- Use plain text only inside JSON string values.
- Do not use markdown, bullet points, asterisks, bold markers, LaTeX syntax, or symbols like $ or \\rightarrow.
- Keep each explanation short and revision-friendly.

Study material:
${text}`,
    maxTokens: 1024,
    routes: [models.concept],
  })

  console.log(`[AI:concept-generation] Completed with provider=${provider} model=${model}`)
  logRawAIResponse('concept-generation', response)
  const concepts = parseKeyConcepts(response)
  console.log(`[AI:concept-generation] Parsed concepts count=${concepts.length}`)

  return concepts
}

export const generateExamQuestions = async (text) => {
  const models = getConfiguredModels()
  const { response, provider, model } = await createCompletionWithFallback({
    taskName: 'quiz-generation',
    content: `You are a JSON-only exam quiz generator.

Create 3 multiple choice exam questions based on this study material.

Return ONLY a valid JSON array. Each item must have this exact shape:
{
  "question": "Question text?",
  "options": ["Processed information", "Raw fact or value", "A set of entities", "An entity set"],
  "answer": "Raw fact or value",
  "explanation": "One short sentence explaining why the answer is correct."
}

Rules:
- Ask exam-oriented questions about important definitions, differences, uses, or examples.
- The answer value must exactly match one option string.
- Do not prefix options with A), B), C), or D).
- Do not reveal answers outside the JSON field.
- Do not include extra text before or after the JSON.
- Do not include markdown code fences.

Study material:
${text}`,
    maxTokens: 1024,
    routes: [models.quiz],
  })

  console.log(`[AI:quiz-generation] Completed with provider=${provider} model=${model}`)
  logRawAIResponse('quiz-generation', response)
  const questions = parseExamQuestions(response)
  console.log(`[AI:quiz-generation] Parsed quiz count=${questions.length}`)

  return questions
}

const cleanConceptText = (value) => {
  return String(value || '')
    .replace(/\$?\\rightarrow\$?/g, 'to')
    .replace(/→/g, 'to')
    .replace(/[`_$]/g, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/^\s*[-+]\s+/gm, '')
    .replace(/^\s*\d+[.)]\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim()
}

const PROMPT_LEAKAGE_PATTERN = /\b(input|task|format|output|rules?|study material|instructions?|return only|json|example|check against constraints|ensure|strict json|json array|prompt labels|markdown)\b\s*:?\s*/i

const containsPromptLeakage = (value) => {
  const cleaned = cleanConceptText(value)
  return !cleaned || PROMPT_LEAKAGE_PATTERN.test(cleaned)
}

const formatConcept = (concept, index) => {
  const rawTitle = typeof concept === 'string' ? concept : concept?.title
  const rawExplanation = typeof concept === 'string' ? '' : concept?.explanation
  const title = cleanConceptText(rawTitle).replace(/^Concept\s+\d+:\s*/i, '')
  const explanation = cleanConceptText(rawExplanation)

  if (containsPromptLeakage(title) || (explanation && containsPromptLeakage(explanation))) return null
  if (!title && !explanation) return null
  if (!explanation) return title

  return `${title}\n${explanation}`
}

const parseConceptJson = (text) => {
  const parsed = parseJsonPayload(text)
  const conceptItems = Array.isArray(parsed) ? parsed : parsed?.concepts
  if (!Array.isArray(conceptItems)) return null

  return conceptItems
      .map(formatConcept)
      .filter(Boolean)
      .slice(0, 8)
}

const parsePlainTextConcepts = (text) => {
  return text
    .split(/\n{2,}|\n(?=\s*(?:Concept\s+\d+|\d+[.)]))/i)
    .map((block, index) => {
      const cleanedBlock = cleanConceptText(block)
      if (!cleanedBlock || containsPromptLeakage(cleanedBlock)) return null

      const conceptMatch = cleanedBlock.match(/^Concept\s+\d+:\s*(.+?)(?:\s+-\s+|\s+:\s+)?(.+)?$/i)
      if (conceptMatch) {
        return formatConcept({
          title: conceptMatch[1],
          explanation: conceptMatch[2] || '',
        }, index)
      }

      return formatConcept(cleanedBlock, index)
    })
    .filter(Boolean)
    .slice(0, 8)
}

const parseKeyConcepts = (text) => {
  const jsonConcepts = parseConceptJson(text)
  if (jsonConcepts && jsonConcepts.length > 0) {
    return jsonConcepts
  }

  console.warn('[AI:concept-generation] Failed to parse clean concept JSON. Returning safe fallback.')
  return [
    'Concepts unavailable\nThe AI response could not be parsed cleanly. Please reprocess this PDF.',
  ]
}

const stripCodeFences = (text) => {
  return String(text || '')
    .replace(/^\s*```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim()
}

const removeTrailingCommas = (text) => text.replace(/,\s*([}\]])/g, '$1')

const extractJsonCandidate = (text) => {
  const cleaned = stripCodeFences(text)
  if (!cleaned) return ''

  const firstArray = cleaned.indexOf('[')
  const firstObject = cleaned.indexOf('{')
  const starts = [firstArray, firstObject].filter(index => index >= 0)
  if (starts.length === 0) return cleaned

  const start = Math.min(...starts)
  const opener = cleaned[start]
  const closer = opener === '[' ? ']' : '}'
  const end = cleaned.lastIndexOf(closer)

  return end > start ? cleaned.slice(start, end + 1) : cleaned
}

const parseJsonPayload = (text) => {
  const attempts = [
    stripCodeFences(text),
    extractJsonCandidate(text),
    removeTrailingCommas(extractJsonCandidate(text)),
  ].filter(Boolean)

  for (const attempt of attempts) {
    try {
      const parsed = JSON.parse(attempt)
      if (typeof parsed === 'string') {
        const nested = parseJsonPayload(parsed)
        if (nested) return nested
      }
      return parsed
    } catch {
      // Try the next cleaned candidate.
    }
  }

  return null
}

const cleanQuizText = (value) => {
  return String(value || '')
    .replace(/^[A-D](?:\)|\.|:)?\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim()
}

const normalizeQuizQuestion = (question) => {
  if (!question || typeof question !== 'object') return null

  const prompt = cleanQuizText(question.question)
  const options = Array.isArray(question.options)
    ? question.options.map(cleanQuizText).filter(Boolean)
    : []
  const answer = cleanQuizText(question.answer || question.correctAnswer)
  const explanation = cleanQuizText(question.explanation)

  if (!prompt || options.length < 2 || !answer) return null

  const matchingOption = options.find(option => option.toLowerCase() === answer.toLowerCase())
  const correctAnswer = matchingOption || answer

  return {
    question: prompt,
    options,
    correctAnswer,
    answer: correctAnswer,
    explanation: explanation || `The correct answer is ${correctAnswer}.`,
  }
}

const parseExamQuestions = (text) => {
  const parsed = parseJsonPayload(text)
  const questionItems = Array.isArray(parsed)
    ? parsed
    : parsed?.questions || parsed?.quizQuestions || parsed?.quiz

  if (!Array.isArray(questionItems)) {
    console.warn('[AI:quiz-generation] Failed to parse quiz JSON array.')
    return []
  }

  return questionItems
    .map(normalizeQuizQuestion)
    .filter(Boolean)
    .slice(0, 3)
}

export const processTextWithAI = async (text) => {
  try {
    // Limit text length for summary to avoid hitting token limits even with chunking
    const textToProcess = text.substring(0, 15000)
    const [summary, concepts, questions] = await Promise.all([
      generateSummary(textToProcess),
      generateKeyConcepts(textToProcess),
      generateExamQuestions(textToProcess),
    ])

    return {
      summary,
      keyConcepts: concepts,
      examQuestions: questions,
    }
  } catch (error) {
    if (error instanceof AIModelError) {
      throw error
    }

    throw new AIModelError(DEFAULT_ERROR_MESSAGE, {
      taskName: 'pdf-processing',
      cause: error,
    })
  }
}

// Simple context selection using keyword matching
const getRelevantChunks = (question, chunks, maxChunks = 3) => {
  if (!chunks || chunks.length === 0) return ''

  const keywords = question.toLowerCase().split(/\W+/).filter(w => w.length > 3)

  const scoredChunks = chunks.map(chunk => {
    let score = 0
    const lowerChunk = chunk.toLowerCase()
    keywords.forEach(kw => {
      if (lowerChunk.includes(kw)) score++
    })
    return { chunk, score }
  })

  scoredChunks.sort((a, b) => b.score - a.score)

  // Return the top N chunks joined together
  return scoredChunks.slice(0, maxChunks).map(c => c.chunk).join('\n\n')
}

export const generateChatResponse = async (question, chatHistory = [], chunks = []) => {
  const models = getConfiguredModels()
  const relevantContext = getRelevantChunks(question, chunks)

  const messages = [
    {
      role: 'system',
      content: `You are an AI Study Agent. Answer the user's question based ONLY on the provided relevant study material context. If the answer is not in the context, say "I cannot find the answer in the study material." \n\nIMPORTANT FORMATTING INSTRUCTIONS:\n- Format your response using Markdown for readability.\n- Use headings, bullet points, numbered lists, and bold text to structure the information clearly.\n- Keep your answer concise, educational, and easy for students to read.\n\nRelevant Context:\n${relevantContext}`,
    },
  ]

  const recentHistory = chatHistory.slice(-4)
  recentHistory.forEach(msg => {
    messages.push({
      role: msg.role === 'ai' ? 'assistant' : 'user',
      content: msg.content,
    })
  })

  messages.push({
    role: 'user',
    content: question,
  })

  try {
    const { response } = await createCompletionWithFallback({
      taskName: 'chat',
      routes: [models.chat],
      maxTokens: 1024,
      messages,
      failureMessage: 'AI chat is temporarily unavailable. Please try again in a few minutes.',
    })

    return response
  } catch (error) {
    if (error instanceof AIModelError) {
      throw error
    }

    throw new AIModelError('AI chat is temporarily unavailable. Please try again in a few minutes.', {
      taskName: 'chat',
      cause: error,
    })
  }
}
