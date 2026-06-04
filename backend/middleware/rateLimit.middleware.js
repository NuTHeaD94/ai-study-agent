import rateLimit from 'express-rate-limit'

// Limit for PDF processing (e.g., 5 requests per hour)
export const processingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: { message: 'Too many PDFs processed. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
})

// Limit for AI chat (e.g., 30 requests per 15 minutes)
export const chatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  message: { message: 'Too many chat messages. Please wait a moment.' },
  standardHeaders: true,
  legacyHeaders: false,
})
