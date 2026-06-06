import rateLimit, { ipKeyGenerator } from 'express-rate-limit'

const authenticatedUserKey = (req) => req.user?._id?.toString() || ipKeyGenerator(req.ip)

// Limit PDF processing per authenticated user, not per shared browser/proxy IP.
export const processingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  keyGenerator: authenticatedUserKey,
  message: { message: 'Too many PDFs processed. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
})

// Limit AI chat per authenticated user, not per shared browser/proxy IP.
export const chatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  keyGenerator: authenticatedUserKey,
  message: { message: 'Too many chat messages. Please wait a moment.' },
  standardHeaders: true,
  legacyHeaders: false,
})
