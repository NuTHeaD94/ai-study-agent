import { Queue, Worker } from 'bullmq'
import Redis from 'ioredis'
import StudyMaterial from '../models/studyMaterial.model.js'
import { processTextWithAI } from './aiService.js'

console.log('[Queue] Initializing Redis connection...')
// Try to connect to Redis
const redisConnection = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
  maxRetriesPerRequest: null,
})

redisConnection.on('connect', () => {
  console.log('[Queue] Successfully connected to Redis.')
})

redisConnection.on('error', (err) => {
  console.error('[Queue] Redis connection error. Ensure Redis is running:', err.message)
})

export const aiProcessingQueue = new Queue('ai-processing', {
  connection: redisConnection,
})

console.log('[Queue] Starting BullMQ Worker for ai-processing queue...')
const worker = new Worker(
  'ai-processing',
  async (job) => {
    const { studyMaterialId, text } = job.data

    try {
      console.log(`[Worker] Started processing job ${job.id} for material ${studyMaterialId}`)
      
      console.log(`[Worker] Job ${job.id}: Calling Groq API for Summary, Concepts, and Quizzes...`)
      const startTime = Date.now()
      const aiResults = await processTextWithAI(text)
      const duration = ((Date.now() - startTime) / 1000).toFixed(2)
      console.log(`[Worker] Job ${job.id}: Groq API calls completed in ${duration}s.`)

      console.log(`[Worker] Job ${job.id}: Saving results to MongoDB...`)
      await StudyMaterial.findByIdAndUpdate(studyMaterialId, {
        summary: aiResults.summary,
        concepts: aiResults.keyConcepts,
        quizQuestions: aiResults.examQuestions,
        status: 'completed',
      })

      console.log(`[Worker] Job ${job.id} completed successfully. Status updated to completed.`)
    } catch (error) {
      console.error(`[Worker] Job ${job.id} failed during execution:`, error)
      console.log(`[Worker] Job ${job.id}: Updating status to failed in MongoDB.`)
      await StudyMaterial.findByIdAndUpdate(studyMaterialId, {
        status: 'failed',
      })
      throw error // Let BullMQ handle the retry/failure logic
    }
  },
  {
    connection: redisConnection,
    concurrency: 2, // Process up to 2 PDFs concurrently
  }
)

worker.on('ready', () => {
  console.log('[Worker] Worker is ready and accepting jobs.')
})

worker.on('failed', (job, err) => {
  console.error(`[Worker] Job ${job?.id} failed ultimately with error:`, err.message)
})
