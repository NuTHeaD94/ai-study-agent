# PDF Upload Functionality

## Overview
Complete PDF upload system with authentication, file storage, and metadata management.

## Architecture

### Backend Structure
```
backend/
├── models/
│   └── pdf.model.js              # PDF metadata schema
├── controllers/
│   └── pdf.controller.js          # Upload, list, delete logic
├── middleware/
│   ├── auth.middleware.js         # JWT protection (existing)
│   └── upload.middleware.js       # Multer configuration
├── routes/
│   └── pdf.routes.js              # PDF endpoints
├── uploads/                       # Uploaded files storage
│   └── .gitkeep                  # Ensure folder tracked
├── server.js                      # Updated with PDF routes
└── .gitignore                     # Added uploads/
```

### Frontend Structure
```
frontend/src/
├── api/
│   └── pdf.js                     # API calls for PDF operations
├── components/
│   ├── UploadForm.jsx             # Upload form component
│   └── PDFList.jsx                # Display uploaded PDFs
├── pages/
│   └── UploadPDF.jsx              # Updated upload page
└── styles/
    ├── upload-form.css            # Upload form styling
    └── pdf-list.css               # PDF list styling
```

## How It Works

### Upload Flow
```
1. User selects PDF file on /upload page
2. UploadForm validates file (PDF only, max 10MB)
3. FormData with file sent to /api/pdf/upload
4. Request interceptor adds JWT token
5. Multer middleware receives file
6. File stored at: backend/uploads/{userId}_{timestamp}_{filename}
7. Metadata saved in MongoDB (filename, originalName, fileSize, uploadedAt, userId)
8. Frontend receives success message
9. PDF list automatically refreshes
```

### Database Schema (MongoDB)
```javascript
{
  _id: ObjectId,
  userId: ObjectId (reference to User),
  filename: "507f_1234567890_myfile.pdf",
  originalName: "myfile.pdf",
  fileSize: 2097152,
  uploadedAt: "2024-06-04T10:30:00Z",
  createdAt: "2024-06-04T10:30:00Z",
  updatedAt: "2024-06-04T10:30:00Z"
}
```

## Backend API Endpoints

### 1. Upload PDF
**POST** `/api/pdf/upload`
- **Auth**: Required (JWT)
- **Content-Type**: multipart/form-data
- **Body**: 
  - `pdf`: File (PDF only, max 10MB)
- **Success Response (201)**:
  ```json
  {
    "message": "PDF uploaded successfully",
    "pdf": {
      "_id": "507f1f77bcf86cd799439011",
      "filename": "507f_1234567890_document.pdf",
      "originalName": "document.pdf",
      "fileSize": 2097152,
      "uploadedAt": "2024-06-04T10:30:00Z"
    }
  }
  ```
- **Error Responses**:
  - 400: "No file uploaded" or "Only PDF files are allowed"
  - 401: "Not authorized, no token"
  - 413: File too large (>10MB)

### 2. List User's PDFs
**GET** `/api/pdf/list`
- **Auth**: Required (JWT)
- **Success Response (200)**:
  ```json
  {
    "count": 3,
    "pdfs": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "filename": "507f_1234567890_document.pdf",
        "originalName": "document.pdf",
        "fileSize": 2097152,
        "uploadedAt": "2024-06-04T10:30:00Z"
      }
    ]
  }
  ```

### 3. Delete PDF
**DELETE** `/api/pdf/:id`
- **Auth**: Required (JWT)
- **Params**: `id` (PDF document ID)
- **Success Response (200)**:
  ```json
  {
    "message": "PDF deleted successfully"
  }
  ```
- **Error Responses**:
  - 403: "Not authorized to delete this PDF"
  - 404: "PDF not found"
  - 401: "Not authorized, no token"

## Frontend Components

### UploadForm Component
**File**: `src/components/UploadForm.jsx`

**Features**:
- File input with validation (PDF only)
- Display selected file name and size
- Loading state during upload
- Success/error messages
- Auto-dismiss success message after 3 seconds
- Callback to refresh PDF list after upload

**Props**:
- `onUploadSuccess`: Function called after successful upload

**Usage**:
```jsx
<UploadForm onUploadSuccess={() => refreshList()} />
```

### PDFList Component
**File**: `src/components/PDFList.jsx`

**Features**:
- Display all user's PDFs
- Show file name, size, and upload date
- Delete PDF with confirmation
- Format file size (B, KB, MB)
- Format date in Indian format
- Loading and error states
- Empty state message

**Props**:
- `refreshTrigger`: Number to trigger list refresh

**Usage**:
```jsx
<PDFList refreshTrigger={refreshCount} />
```

### API Utilities
**File**: `src/api/pdf.js`

**Functions**:
- `pdfAPI.upload(formData)`: Upload PDF
- `pdfAPI.list()`: Get user's PDFs
- `pdfAPI.delete(id)`: Delete PDF

**Usage**:
```javascript
import { pdfAPI } from '../api/pdf'

// Upload
const response = await pdfAPI.upload(formData)

// List
const { data } = await pdfAPI.list()

// Delete
await pdfAPI.delete(pdfId)
```

## Multer Configuration

**File**: `backend/middleware/upload.middleware.js`

**Settings**:
- **Destination**: `backend/uploads/`
- **Filename**: `{userId}_{timestamp}_{originalname}`
- **File Filter**: Only PDF files (application/pdf)
- **Size Limit**: 10 MB
- **Single File**: Field name is "pdf"

**Error Handling**:
- Returns 400 if file type is not PDF
- Returns 413 if file exceeds size limit
- Returns 400 if no file provided

## Security Features

1. **Authentication**: All endpoints protected with JWT
2. **Authorization**: Users can only see/delete their own PDFs
3. **File Validation**: 
   - Only PDF files accepted
   - MIME type checking
   - File size limit (10 MB)
4. **User Isolation**: 
   - Files stored with user ID prefix
   - Database query filters by userId
   - Delete only allowed for file owner

## Testing

### Test Upload
```bash
# Using curl
curl -X POST http://localhost:5000/api/pdf/upload \
  -H "Authorization: Bearer <token>" \
  -F "pdf=@path/to/file.pdf"
```

### Test List
```bash
curl -X GET http://localhost:5000/api/pdf/list \
  -H "Authorization: Bearer <token>"
```

### Test Delete
```bash
curl -X DELETE http://localhost:5000/api/pdf/<pdf_id> \
  -H "Authorization: Bearer <token>"
```

## Frontend Usage

### Register/Login First
1. Go to http://localhost:5173/register
2. Create account
3. Token auto-stored in localStorage

### Upload PDF
1. Navigate to `/upload`
2. Select PDF file or drag & drop
3. Click "Upload PDF"
4. Wait for success message
5. PDF appears in list below

### View Uploads
- PDFs show on `/upload` page
- Sort by upload date (newest first)
- Show file size and upload date

### Delete PDF
- Click "✕" button on PDF item
- Confirm deletion
- PDF removed from list

## File Storage

**Location**: `backend/uploads/`

**File Naming**: `{userId}_{timestamp}_{originalName}`

**Example**:
```
507f1f77bcf86cd799439011_1717487400000_mathematics.pdf
```

**File Access**:
- Direct file access via: `http://localhost:5000/uploads/{filename}`
- Protected by frontend auth (token in localStorage)
- Backend serves static files (not truly protected)

## Environment Setup

**Backend .env** (already configured):
```
MONGO_URI=mongodb://localhost:27017/ai-study-agent
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=30d
PORT=5000
```

**Frontend .env** (already configured):
```
VITE_API_URL=http://localhost:5000/api
```

## Troubleshooting

### Issue: "Only PDF files are allowed"
- Check file is actually PDF (not renamed)
- Check MIME type with file command

### Issue: "File too large"
- Max size is 10 MB
- Compress PDF or split into parts

### Issue: "Not authorized, no token"
- User not logged in
- Token expired
- Clear localStorage and re-login

### Issue: Files not uploaded
- Check `backend/uploads/` folder exists
- Check file permissions
- Check multer middleware loaded

### Issue: PDFs not appearing in list
- Refresh page
- Check network tab for API errors
- Check browser DevTools console

## Scalability Notes

### Current Limitations
- Files stored locally (not cloud)
- No file encryption
- No virus scanning
- Limited to 10MB files

### Future Enhancements
1. **Cloud Storage**: Move to AWS S3 or similar
2. **Virus Scanning**: Integrate ClamAV
3. **Compression**: Auto-compress PDFs
4. **Virus Scanning**: Integrate with malware scanner
5. **File Preview**: Show PDF preview
6. **Metadata Extraction**: Extract text, pages count
7. **Search**: Search PDFs by name

## Files Checklist

**Backend**:
- ✓ `models/pdf.model.js` - PDF schema
- ✓ `controllers/pdf.controller.js` - Upload/list/delete logic
- ✓ `middleware/upload.middleware.js` - Multer config
- ✓ `routes/pdf.routes.js` - Protected API endpoints
- ✓ `uploads/.gitkeep` - Folder structure
- ✓ `.gitignore` - Added uploads/
- ✓ `server.js` - PDF routes integrated

**Frontend**:
- ✓ `api/pdf.js` - API utility functions
- ✓ `components/UploadForm.jsx` - Upload component
- ✓ `components/PDFList.jsx` - List component
- ✓ `pages/UploadPDF.jsx` - Updated page
- ✓ `styles/upload-form.css` - Upload styling
- ✓ `styles/pdf-list.css` - List styling

All files ready! Start both servers and test.
