import PDF from '../models/pdf.model.js'

// POST /api/pdf/upload
export const uploadPDF = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' })
    }

    const pdf = await PDF.create({
      userId: req.user._id,
      filename: req.file.filename,
      originalName: req.file.originalname,
      fileSize: req.file.size,
    })

    res.status(201).json({
      message: 'PDF uploaded successfully',
      pdf: {
        _id: pdf._id,
        filename: pdf.filename,
        originalName: pdf.originalName,
        fileSize: pdf.fileSize,
        uploadedAt: pdf.uploadedAt,
      },
    })
  } catch (err) {
    next(err)
  }
}

// GET /api/pdf/list
export const listUserPDFs = async (req, res, next) => {
  try {
    const pdfs = await PDF.find({ userId: req.user._id })
      .sort({ uploadedAt: -1 })
      .select('-userId')

    res.json({
      count: pdfs.length,
      pdfs,
    })
  } catch (err) {
    next(err)
  }
}

// DELETE /api/pdf/:id
export const deletePDF = async (req, res, next) => {
  try {
    const pdf = await PDF.findById(req.params.id)

    if (!pdf) {
      return res.status(404).json({ message: 'PDF not found' })
    }

    // Check if user owns the PDF
    if (pdf.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this PDF' })
    }

    await PDF.findByIdAndDelete(req.params.id)

    res.json({ message: 'PDF deleted successfully' })
  } catch (err) {
    next(err)
  }
}
