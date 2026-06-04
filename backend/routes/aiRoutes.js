import { Router } from 'express'
import {
  processPDF,
  getAIResult,
  getAllAIResults,
  deleteAIResult,
  chatWithMaterial,
} from '../controllers/aiController.js'
import { protect } from '../middleware/auth.middleware.js'
import { processingLimiter, chatLimiter } from '../middleware/rateLimit.middleware.js'

const router = Router()

// Protect all routes
router.use(protect)

// POST /api/ai/process/:pdfId - Process PDF with AI
router.post('/process/:pdfId', processingLimiter, processPDF)

// GET /api/ai/result/:id - Get AI result for specific StudyMaterial
router.get('/result/:id', getAIResult)

// GET /api/ai/results - Get all AI results
router.get('/results', getAllAIResults)

// DELETE /api/ai/result/:id - Delete AI result
router.delete('/result/:id', deleteAIResult)

// POST /api/ai/chat/:id - Chat with specific StudyMaterial
router.post('/chat/:id', chatLimiter, chatWithMaterial)

export default router
