import path from 'path'
import { fileURLToPath } from 'url'
import PDF from '../models/pdf.model.js'
import StudyMaterial from '../models/studyMaterial.model.js'
import { extractTextFromPDF, cleanExtractedText, chunkText } from '../services/pdfService.js'
import { generateChatResponse, processTextWithAI } from '../services/aiService.js'
import { aiProcessingQueue } from '../services/queueService.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// POST /api/ai/process/:pdfId
export const processPDF = async (req, res, next) => {
  try {
    const { pdfId } = req.params

    // Find PDF
    const pdf = await PDF.findById(pdfId)
    if (!pdf) {
      return res.status(404).json({ message: 'PDF not found' })
    }

    // Verify ownership
    if (pdf.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' })
    }

    // Check if already processed and saved as StudyMaterial
    const filePath = path.join(__dirname, `../uploads/${pdf.filename}`)
    const existingResult = await StudyMaterial.findOne({ filePath, uploadedBy: req.user._id })
    
    if (existingResult) {
      return res.status(200).json({
        message: 'PDF already processed or processing',
        result: existingResult
      })
    }

    // Extract text
    console.log(`[processPDF] Extracting text from ${filePath}`)
    const rawText = await extractTextFromPDF(filePath)
    const cleanedText = cleanExtractedText(rawText)

    if (!cleanedText || cleanedText.length < 50) {
      console.warn(`[processPDF] Insufficient text extracted: ${cleanedText?.length || 0} chars`)
      return res.status(400).json({ message: 'PDF has insufficient content for processing' })
    }

    console.log(`[processPDF] Text extracted successfully. Length: ${cleanedText.length} chars`)

    // Chunk text for chat context storage
    console.log(`[processPDF] Chunking text...`)
    const chunks = chunkText(cleanedText, 1000)
    console.log(`[processPDF] Created ${chunks.length} chunks.`)

    if (process.env.DIRECT_PROCESSING === 'true') {
      console.log(`[processPDF] DIRECT_PROCESSING is true. Bypassing BullMQ.`)
      // Process synchronously
      try {
        const aiResults = await processTextWithAI(cleanedText)
        const result = await StudyMaterial.create({
          title: pdf.originalName,
          filePath: filePath,
          status: 'completed',
          chunks: chunks,
          summary: aiResults.summary,
          concepts: aiResults.keyConcepts,
          quizQuestions: aiResults.examQuestions,
          uploadedBy: req.user._id,
        })
        console.log(`[processPDF] Direct processing successful. Material ID: ${result._id}`)
        return res.status(201).json({
          message: 'PDF processed and study material saved successfully (Direct)',
          result,
        })
      } catch (directError) {
        console.error(`[processPDF] Direct processing failed:`, directError)
        return res.status(500).json({ message: 'Direct AI processing failed' })
      }
    }

    // Save initial results to database as StudyMaterial with 'processing' status
    console.log(`[processPDF] Saving initial StudyMaterial to MongoDB...`)
    const result = await StudyMaterial.create({
      title: pdf.originalName,
      filePath: filePath,
      status: 'processing',
      chunks: chunks,
      uploadedBy: req.user._id,
    })
    console.log(`[processPDF] StudyMaterial saved with ID: ${result._id}`)

    // Enqueue the heavy AI processing task
    try {
      console.log(`[processPDF] Adding job to ai-processing queue...`)
      await aiProcessingQueue.add('process-pdf', {
        studyMaterialId: result._id,
        text: cleanedText
      }, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000
        }
      })
      console.log(`[processPDF] Job added to queue successfully.`)
    } catch (queueError) {
      console.error('[processPDF] Failed to add job to queue:', queueError)
      result.status = 'failed'
      await result.save()
      return res.status(500).json({ message: 'Failed to queue processing tasks. Ensure Redis is running.' })
    }

    res.status(202).json({
      message: 'PDF processing has been queued',
      result,
    })
  } catch (err) {
    next(err)
  }
}

// GET /api/ai/results (which will now fetch StudyMaterials)
export const getAllAIResults = async (req, res, next) => {
  try {
    const results = await StudyMaterial.find({ uploadedBy: req.user._id })
      .sort({ createdAt: -1 })

    res.json({
      count: results.length,
      results,
    })
  } catch (err) {
    next(err)
  }
}

// GET /api/ai/result/:id (Using StudyMaterial ID)
export const getAIResult = async (req, res, next) => {
  try {
    const { id } = req.params

    const result = await StudyMaterial.findOne({ _id: id, uploadedBy: req.user._id })

    if (!result) {
      return res.status(404).json({ message: 'Study material not found' })
    }

    res.json(result)
  } catch (err) {
    next(err)
  }
}

// DELETE /api/ai/result/:id
export const deleteAIResult = async (req, res, next) => {
  try {
    const { id } = req.params

    const result = await StudyMaterial.findOne({ _id: id, uploadedBy: req.user._id })

    if (!result) {
      return res.status(404).json({ message: 'Study material not found' })
    }

    await StudyMaterial.deleteOne({ _id: result._id })

    res.json({ message: 'Study material deleted successfully' })
  } catch (err) {
    next(err)
  }
}

// POST /api/ai/chat/:id
export const chatWithMaterial = async (req, res, next) => {
  try {
    const { id } = req.params
    const { question } = req.body

    if (!question) {
      return res.status(400).json({ message: 'Question is required' })
    }

    const studyMaterial = await StudyMaterial.findOne({ _id: id, uploadedBy: req.user._id })

    if (!studyMaterial) {
      return res.status(404).json({ message: 'Study material not found' })
    }
    
    if (studyMaterial.status === 'processing') {
      return res.status(400).json({ message: 'Study material is still processing' })
    }

    if (!studyMaterial.chunks || studyMaterial.chunks.length === 0) {
       return res.status(400).json({ message: 'No content chunks found for this material' })
    }

    // Get response from AI using chunks for context selection
    const aiResponse = await generateChatResponse(question, studyMaterial.chatHistory || [], studyMaterial.chunks)

    // Save chat history
    studyMaterial.chatHistory.push({ role: 'user', content: question })
    studyMaterial.chatHistory.push({ role: 'ai', content: aiResponse })
    await studyMaterial.save()

    res.json({
      answer: aiResponse,
      chatHistory: studyMaterial.chatHistory
    })
  } catch (err) {
    next(err)
  }
}
