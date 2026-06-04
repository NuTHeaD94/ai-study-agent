import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import connectDB from './config/db.js'
import authRoutes from './routes/auth.routes.js'
import pdfRoutes from './routes/pdf.routes.js'
import aiRoutes from './routes/aiRoutes.js'
import { errorHandler } from './middleware/error.middleware.js'
import './services/queueService.js' // Initialize and start BullMQ worker

const __dirname = path.dirname(fileURLToPath(import.meta.url))

dotenv.config()
connectDB()

const app = express()

app.use(cors({
  origin: [
    'http://localhost:5173', 
    'https://ai-study-agent-1z87.vercel.app', 
    'http://localhost:3000'
  ],
  credentials: true
}))
app.use(express.json())

// Serve uploads folder as static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/pdf', pdfRoutes)
app.use('/api/ai', aiRoutes)

// Health check
app.get('/', (req, res) => res.json({ message: 'Study Agent API running' }))

// Error handler (must be last)
app.use(errorHandler)

const PORT = process.env.PORT || 5000
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
