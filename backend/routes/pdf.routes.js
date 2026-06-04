import { Router } from 'express'
import { uploadPDF, listUserPDFs, deletePDF } from '../controllers/pdf.controller.js'
import { protect } from '../middleware/auth.middleware.js'
import upload from '../middleware/upload.middleware.js'

const router = Router()

// Protect all routes
router.use(protect)

// POST /api/pdf/upload - Upload PDF
router.post('/upload', upload.single('pdf'), uploadPDF)

// GET /api/pdf/list - Get user's PDFs
router.get('/list', listUserPDFs)

// DELETE /api/pdf/:id - Delete PDF
router.delete('/:id', deletePDF)

export default router
