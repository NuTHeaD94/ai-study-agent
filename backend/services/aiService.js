import { Groq } from 'groq-sdk'

let groq = null
const DEFAULT_SUMMARY_MODEL = 'llama-3.3-70b-versatile'
const DEFAULT_CHAT_MODEL = 'llama-3.1-8b-instant'

const getGroqClient = () => {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not configured')
  }

  if (!groq) {
    groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    })
  }
  return groq
}

const createCompletion = async (content, maxTokens, model) => {
  const groqClient = getGroqClient()

  const completion = await groqClient.chat.completions.create({
    model: model || process.env.SUMMARY_MODEL || DEFAULT_SUMMARY_MODEL,
    max_tokens: maxTokens,
    messages: [
      {
        role: 'user',
        content,
      },
    ],
  })

  const response = completion.choices?.[0]?.message?.content
  if (!response) {
    throw new Error('Groq returned an empty completion')
  }

  return response
}

export const generateSummary = async (text) => {
  return createCompletion(
    `Please read and summarize the following study material in 3-4 concise paragraphs. Focus on main concepts and key information:\n\n${text}\n\nSummary:`,
    1024,
    process.env.SUMMARY_MODEL || DEFAULT_SUMMARY_MODEL
  )
}

export const generateKeyConcepts = async (text) => {
  const response = await createCompletion(
    `Extract the 5-8 most important concepts from this study material. Return them as a numbered list with brief explanations:\n\n${text}\n\nKey Concepts:`,
    512,
    process.env.SUMMARY_MODEL || DEFAULT_SUMMARY_MODEL
  )

  return parseKeyConcepts(response)
}

export const generateExamQuestions = async (text) => {
  const response = await createCompletion(
    `Create 3 multiple choice exam questions based on this study material. Format each question as JSON:\n{\n  "question": "Question text?",\n  "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],\n  "correctAnswer": "A) Option 1"\n}\n\nReturn ONLY valid JSON array format, no extra text.\n\n${text}\n\nQuestions:`,
    1024,
    process.env.SUMMARY_MODEL || DEFAULT_SUMMARY_MODEL
  )

  return parseExamQuestions(response)
}

const parseKeyConcepts = (text) => {
  // Extract numbered items from text
  const lines = text.split('\n').filter(line => line.trim())
  return lines
    .map(line => line.replace(/^\d+\.\s*/, '').trim())
    .filter(line => line.length > 0)
    .slice(0, 8) // Limit to 8 concepts
}

const parseExamQuestions = (text) => {
  try {
    // Extract JSON arrays from the response
    const jsonMatch = text.match(/\[[\s\S]*\]/g)
    if (!jsonMatch) return []

    const parsed = JSON.parse(jsonMatch[0])
    return Array.isArray(parsed) ? parsed.slice(0, 3) : [] // Limit to 3 questions
  } catch {
    return []
  }
}

export const processTextWithAI = async (text) => {
  try {
    // Limit text length for summary to avoid hitting token limits even with chunking
    const textToProcess = text.substring(0, 15000); 
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
    throw new Error(`AI processing failed: ${error.message}`)
  }
}

// Simple context selection using keyword matching
const getRelevantChunks = (question, chunks, maxChunks = 3) => {
  if (!chunks || chunks.length === 0) return '';
  
  const keywords = question.toLowerCase().split(/\W+/).filter(w => w.length > 3);
  
  const scoredChunks = chunks.map(chunk => {
    let score = 0;
    const lowerChunk = chunk.toLowerCase();
    keywords.forEach(kw => {
      if (lowerChunk.includes(kw)) score++;
    });
    return { chunk, score };
  });

  scoredChunks.sort((a, b) => b.score - a.score);
  
  // Return the top N chunks joined together
  return scoredChunks.slice(0, maxChunks).map(c => c.chunk).join('\n\n');
}

export const generateChatResponse = async (question, chatHistory = [], chunks = []) => {
  const groqClient = getGroqClient()
  
  const relevantContext = getRelevantChunks(question, chunks);
  
  // Format history for Groq
  const messages = [
    {
      role: 'system',
      content: `You are an AI Study Agent. Answer the user's question based ONLY on the provided relevant study material context. If the answer is not in the context, say "I cannot find the answer in the study material." \n\nIMPORTANT FORMATTING INSTRUCTIONS:\n- Format your response using Markdown for readability.\n- Use headings, bullet points, numbered lists, and bold text to structure the information clearly.\n- Keep your answer concise, educational, and easy for students to read.\n\nRelevant Context:\n${relevantContext}`
    }
  ]
  
  // Add previous chat history (limit to last 4 messages to save tokens)
  const recentHistory = chatHistory.slice(-4);
  recentHistory.forEach(msg => {
    messages.push({
      role: msg.role === 'ai' ? 'assistant' : 'user',
      content: msg.content
    })
  })
  
  // Add current question
  messages.push({
    role: 'user',
    content: question
  })

  try {
    const completion = await groqClient.chat.completions.create({
      model: process.env.CHAT_MODEL || DEFAULT_CHAT_MODEL,
      max_tokens: 1024,
      messages: messages,
    })

    const response = completion.choices?.[0]?.message?.content
    if (!response) {
      throw new Error('Groq returned an empty completion')
    }

    return response
  } catch (error) {
    throw new Error(`AI Chat failed: ${error.message}`)
  }
}
