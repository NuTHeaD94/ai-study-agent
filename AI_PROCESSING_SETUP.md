# AI PDF Processing with Groq

## Overview
Complete AI processing system for PDFs using Groq API to generate summaries, key concepts, and exam questions.

## Architecture

### Backend Files
```
backend/
├── models/
│   └── aiResult.model.js              # Store AI results in MongoDB
├── services/
│   ├── pdfService.js                  # PDF text extraction
│   └── aiService.js                   # Groq AI integration
├── controllers/
│   └── aiController.js                # AI processing logic
├── routes/
│   └── aiRoutes.js                    # Protected AI endpoints
├── server.js                          # Updated with AI routes
└── .env                               # Added GROQ_API_KEY
```

### Frontend Files
```
frontend/src/
├── api/
│   └── ai.js                          # AI API calls
├── components/
│   ├── AISummary.jsx                  # Display AI results
│   └── PDFList.jsx                    # Updated with process button
├── pages/
│   └── UploadPDF.jsx                  # Updated with modal
└── styles/
    ├── ai-summary.css                 # Summary styling
    ├── pdf-list.css                   # Updated with new buttons
    └── upload-page.css                # Updated with modal styling
```

## How It Works

### PDF Processing Flow
```
1. User clicks "✨" button on PDF item
2. Frontend sends POST /api/ai/process/:pdfId
3. Backend receives request (JWT verified)
4. Extract text from PDF file using pdf-parse
5. Clean & limit text to 10,000 chars
6. Send to Groq API:
   - Generate summary (1024 tokens)
   - Extract key concepts (512 tokens)
   - Generate exam questions (1024 tokens)
7. Parse & store results in MongoDB
8. Frontend gets results and displays in modal
9. Results cached - click "📊" to view again
```

### AI Result Schema (MongoDB)
```javascript
{
  _id: ObjectId,
  pdfId: ObjectId (ref to PDF),
  userId: ObjectId (ref to User),
  originalName: "document.pdf",
  textContent: "Extracted PDF text...",
  summary: "Generated summary...",
  keyConcepts: ["Concept 1", "Concept 2", ...],
  examQuestions: [
    {
      question: "Question text?",
      options: ["A) ...", "B) ...", "C) ...", "D) ..."],
      correctAnswer: "A) ..."
    }
  ],
  processedAt: "2024-06-04T10:30:00Z",
  createdAt: "2024-06-04T10:30:00Z",
  updatedAt: "2024-06-04T10:30:00Z"
}
```

## Backend API Endpoints

### 1. Process PDF with AI
**POST** `/api/ai/process/:pdfId`
- **Auth**: Required (JWT)
- **Params**: `pdfId` (PDF document ID)
- **Success Response (201)**:
  ```json
  {
    "message": "PDF processed successfully",
    "result": {
      "_id": "507f1f77bcf86cd799439011",
      "summary": "Generated summary...",
      "keyConcepts": ["Concept 1", "Concept 2"],
      "examQuestions": [...],
      "processedAt": "2024-06-04T10:30:00Z"
    }
  }
  ```
- **Error Responses**:
  - 400: "PDF already processed"
  - 400: "PDF has insufficient content"
  - 403: "Not authorized"
  - 404: "PDF not found"
  - 500: "AI processing failed"

### 2. Get AI Result for PDF
**GET** `/api/ai/result/:pdfId`
- **Auth**: Required (JWT)
- **Params**: `pdfId` (PDF document ID)
- **Success Response (200)**: AIResult object
- **Error Responses**:
  - 404: "No AI result found"
  - 403: "Not authorized"

### 3. Get All AI Results
**GET** `/api/ai/results`
- **Auth**: Required (JWT)
- **Success Response (200)**:
  ```json
  {
    "count": 3,
    "results": [...]
  }
  ```

### 4. Delete AI Result
**DELETE** `/api/ai/result/:pdfId`
- **Auth**: Required (JWT)
- **Params**: `pdfId` (PDF document ID)
- **Success Response (200)**:
  ```json
  {
    "message": "AI result deleted successfully"
  }
  ```

## Services

### PDF Service (`pdfService.js`)
**Functions**:
- `extractTextFromPDF(filePath)`: Extract text from PDF file
- `cleanExtractedText(text)`: Normalize and limit text

**Process**:
1. Read file buffer from disk
2. Parse PDF using pdf-parse
3. Extract plain text
4. Remove extra whitespace
5. Limit to 10,000 characters for API

### AI Service (`aiService.js`)
**Functions**:
- `generateSummary(text)`: Create concise summary
- `generateKeyConcepts(text)`: Extract 5-8 key concepts
- `generateExamQuestions(text)`: Generate 3 MCQ questions
- `processTextWithAI(text)`: Run all above in parallel

**Groq Model**: `llama-3.3-70b-versatile`

**Prompt Engineering**:
- Summary: Focus on main concepts (3-4 paragraphs)
- Concepts: Numbered list with brief explanations
- Questions: JSON format with options and correct answer

## Frontend Components

### AISummary Component
**File**: `src/components/AISummary.jsx`

**Features**:
- Tabbed interface (Summary, Concepts, Quiz)
- Display AI-generated content
- Pretty formatting with colors
- Scrollable content area
- Loading and error states

**Props**:
- `pdfId`: PDF document ID
- `onClose`: Callback when closing modal

### PDFList Component Updates
**File**: `src/components/PDFList.jsx`

**New Features**:
- Process button (✨) for each PDF
- Show processing status
- Display "✓ Processed" badge
- Change button to "📊" when processed
- Auto-fetch all AI results
- Call callbacks for modal display

### UploadPDF Page Updates
**File**: `src/pages/UploadPDF.jsx`

**New Features**:
- Modal overlay for AI summary
- Processing notification
- Pass callbacks to PDFList
- Handle modal open/close

## Configuration

### Backend Environment Variables
```env
# .env
GROQ_API_KEY=your_groq_api_key
```

### Groq API
- **Provider**: Groq (Fast LLM API)
- **Model**: `llama-3.3-70b-versatile`
- **Max Tokens**: 1024 per request
- **API**: groq-sdk for Node.js

## Testing

### Test Processing a PDF
```bash
# 1. Upload PDF first
POST http://localhost:5173/upload
# Select a PDF and upload

# 2. Click "✨" button to process

# 3. Check AI Summary modal
# Should see Summary, Concepts, Quiz tabs

# 4. Verify in MongoDB
# airesults collection should have entry
```

### Test API Directly
```bash
# Get token from login first

# Process PDF
curl -X POST http://localhost:5000/api/ai/process/PDF_ID \
  -H "Authorization: Bearer TOKEN"

# Get result
curl -X GET http://localhost:5000/api/ai/result/PDF_ID \
  -H "Authorization: Bearer TOKEN"

# Get all results
curl -X GET http://localhost:5000/api/ai/results \
  -H "Authorization: Bearer TOKEN"
```

## Error Handling

### Common Issues

**Issue**: "GROQ_API_KEY not found"
- **Solution**: Add API key to backend/.env

**Issue**: "No AI result found"
- **Solution**: Process PDF first by clicking ✨ button

**Issue**: "PDF has insufficient content"
- **Solution**: PDF must have at least 50 characters of text

**Issue**: "AI processing failed"
- **Solution**: Check Groq API status, may be rate limited
- **Solution**: Ensure internet connection

**Issue**: Slow processing
- **Solution**: Large PDFs take longer (up to 2-3 minutes)
- **Solution**: Wait for "✓ Processed" badge
- **Solution**: Check browser console for errors

## Performance Notes

### Processing Time
- Small PDFs (< 500 KB): 30-60 seconds
- Medium PDFs (500 KB - 1 MB): 60-120 seconds
- Large PDFs (> 1 MB): 2-3 minutes

### Groq API Limits
- Current model: `llama-3.3-70b-versatile`
- Concurrent requests: 30+ requests/minute
- Input tokens: ~10,000 per request
- Output tokens: ~2,500 per request

### Storage
- Summaries stored in MongoDB
- Not stored locally (only in DB)
- Text content stored for reference
- Can be deleted independently

## Advanced Features (Future)

1. **Streaming Responses**: Real-time processing updates
2. **Better Prompts**: Domain-specific prompting
3. **Multi-language**: Support for different languages
4. **Search**: Search across AI results
5. **Export**: Export summaries as PDF/Word
6. **Caching**: Cache similar requests
7. **Analytics**: Track processing metrics
8. **Feedback**: User ratings for results

## Architecture Decisions

### Why Not Vector Embeddings?
- Adds complexity (Pinecone, Weaviate, etc.)
- Not needed for single documents
- Would require extra API calls
- Increases cost and latency

### Why Not LangChain?
- Over-engineered for simple tasks
- Adds unnecessary dependencies
- Harder to debug and understand
- Direct Groq SDK is faster

### Why Not Agent Framework?
- Overkill for deterministic tasks
- Simple functions are sufficient
- Better error handling control
- Easier to maintain

### Direct Approach Benefits
- Fast and simple
- Easy to understand
- Easy to debug
- Easy to modify
- Minimal dependencies
- Cost-effective

## File Checklist

**Backend**:
- ✓ `models/aiResult.model.js` - AI result schema
- ✓ `services/pdfService.js` - PDF extraction
- ✓ `services/aiService.js` - Groq integration
- ✓ `controllers/aiController.js` - Processing logic
- ✓ `routes/aiRoutes.js` - Protected endpoints
- ✓ `server.js` - AI routes added
- ✓ `.env` - Groq API key added
- ✓ `package.json` - pdf-parse installed

**Frontend**:
- ✓ `api/ai.js` - API utilities
- ✓ `components/AISummary.jsx` - Display component
- ✓ `components/PDFList.jsx` - Updated with process button
- ✓ `pages/UploadPDF.jsx` - Updated with modal
- ✓ `styles/ai-summary.css` - Summary styling
- ✓ `styles/pdf-list.css` - Updated button styles
- ✓ `styles/upload-page.css` - Modal styling

All files ready!

## Next Steps

1. **Restart Servers**
   - Kill existing backend/frontend
   - Start fresh with new code

2. **Test Upload**
   - Upload a PDF
   - Click "✨" to process
   - View results in modal

3. **Monitor Console**
   - Frontend: DevTools Console
   - Backend: Terminal logs
   - MongoDB: Check collection

4. **Iterate**
   - Modify prompts if needed
   - Adjust token limits
   - Add more AI features
