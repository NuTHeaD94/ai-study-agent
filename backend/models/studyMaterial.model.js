import mongoose from 'mongoose'

const studyMaterialSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    filePath: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['processing', 'completed', 'failed'],
      default: 'processing',
    },
    summary: {
      type: String,
      required: false, // Changed to false to allow initial creation before AI finishes
    },
    concepts: [
      {
        type: String,
      },
    ],
    quizQuestions: [
      {
        question: String,
        options: [String],
        correctAnswer: String,
        answer: String,
        explanation: String,
      },
    ],
    processingError: {
      type: String,
      default: null,
    },
    aiErrors: {
      concepts: {
        type: String,
        default: null,
      },
      quiz: {
        type: String,
        default: null,
      },
    },
    chunks: [
      {
        type: String,
      }
    ],
    chatHistory: [
      {
        role: {
          type: String,
          enum: ['user', 'ai'],
          required: true,
        },
        content: {
          type: String,
          required: true,
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
)

export default mongoose.model('StudyMaterial', studyMaterialSchema)
