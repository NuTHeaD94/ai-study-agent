import fs from 'fs'
import { PDFParse } from 'pdf-parse'

export const extractTextFromPDF = async (filePath) => {
  let parser

  try {
    const fileBuffer = fs.readFileSync(filePath)
    parser = new PDFParse({ data: fileBuffer })

    const data = await parser.getText()
    return data.text
  } catch (error) {
    throw new Error(`Failed to extract text from PDF: ${error.message}`)
  } finally {
    if (parser) {
      await parser.destroy()
    }
  }
}

export const cleanExtractedText = (text) => {
  // Remove extra whitespace and normalize text
  return text
    .replace(/\s+/g, ' ')
    .trim()
}

export const chunkText = (text, maxLength = 1000) => {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text]
  const chunks = []
  let currentChunk = ''

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > maxLength && currentChunk.length > 0) {
      chunks.push(currentChunk.trim())
      currentChunk = ''
    }
    currentChunk += ' ' + sentence
  }

  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim())
  }

  return chunks
}
