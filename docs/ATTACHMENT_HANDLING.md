# Email Attachment Handling - Implementation Guide

## ✅ Feature Status: FULLY IMPLEMENTED

Complete attachment handling has been implemented for the electronic registry (Registratura) system.

---

## 🎯 What Was Implemented

### 1. **Attachment Extraction from IMAP**
- ✅ Extracts all attachments from incoming emails (PDF, DOC, DOCX, images, etc.)
- ✅ Captures filename, content (Buffer), MIME type, and size
- ✅ Implemented in `lib/email-service.ts` using `mailparser` library

### 2. **Firebase Storage Upload**
- ✅ Uploads attachments to path: `/registratura/{registryNumber}/attachments/{filename}`
- ✅ Sanitizes filenames to prevent security issues
- ✅ Stores with proper MIME type metadata
- ✅ Returns Firebase Storage download URLs
- ✅ Implemented in `lib/registratura-service.ts`

### 3. **Firestore Metadata Storage**
- ✅ Updated schema in `types/registratura.ts`:
  ```typescript
  interface EmailAttachment {
    fileName: string;        // Original filename
    downloadURL: string;     // Firebase Storage URL
    fileSize: number;        // Size in bytes
    fileType: string;        // MIME type (e.g., 'application/pdf')
    uploadedAt: Timestamp;   // Upload timestamp
  }
  ```

### 4. **Admin UI Display**
- ✅ Shows attachment count in table view
- ✅ Displays total size of attachments
- ✅ Shows file-type-specific icons (PDF, Word, Excel, images, etc.)
- ✅ Color-coded by file type
- ✅ Download button for each attachment
- ✅ Responsive design with hover effects

### 5. **Utility Functions**
Created `lib/utils/formatFileSize.ts` with:
- ✅ `formatFileSize()` - Converts bytes to human-readable format (KB, MB, GB)
- ✅ `getFileIcon()` - Returns appropriate icon name based on MIME type
- ✅ `getFileTypeColor()` - Returns Tailwind color class for file type

---

## 📁 Files Modified

### Core Files
1. **`types/registratura.ts`** - Updated `EmailAttachment` interface
2. **`lib/registratura-service.ts`** - Enhanced `uploadAttachment()` method
3. **`lib/firebase.ts`** - Added `REGISTRATURA_EMAILS` to collections
4. **`app/actions/sync-emails.ts`** - Updated to upload attachments before creating records
5. **`app/api/fetch-emails/route.ts`** - Updated to match sync-emails logic

### New Files
6. **`lib/utils/formatFileSize.ts`** - Utility functions for file handling

### UI Files
7. **`app/admin/registratura/page.tsx`** - Enhanced attachment display

---

## 🔄 How It Works

### Email Sync Flow with Attachments

```
1. User clicks "Verifică Email-uri" button
   ↓
2. Server action connects to IMAP server
   ↓
3. Fetches new emails with attachments
   ↓
4. For each email:
   a. Check for spam → Skip if spam
   b. Check for duplicates → Skip if exists
   c. Generate registration number (e.g., REG-2025-000123)
   d. Upload each attachment to Firebase Storage:
      - Path: /registratura/REG-2025-000123/attachments/filename.pdf
      - Store with MIME type metadata
   e. Create Firestore document with:
      - Email metadata (from, subject, body, etc.)
      - Attachment metadata (fileName, downloadURL, fileSize, fileType)
   ↓
5. Return results to UI
   ↓
6. UI displays emails with attachment count and size
```

---

## 🎨 UI Features

### Table View
Shows for each email:
- **Attachment Count**: "2 fișiere"
- **Total Size**: "(1.5 MB)"
- **Icon**: Blue paperclip icon
- **Color**: Blue (#3B82F6) to indicate attachments

### Details Modal
Shows for each attachment:
- **File Icon**: Type-specific icon (PDF, Word, Excel, Image, etc.)
- **Color**: Type-specific color (red for PDF, blue for Word, green for Excel, etc.)
- **Filename**: Original filename
- **File Size**: Human-readable format (e.g., "1.5 MB")
- **File Type**: Extension in uppercase (e.g., "PDF", "DOCX")
- **Download Button**: Opens file in new tab

### Supported File Types

| Type | Icon | Color | Examples |
|------|------|-------|----------|
| PDF | FileText | Red | .pdf |
| Word | FileText | Blue | .doc, .docx |
| Excel | Sheet | Green | .xls, .xlsx, .csv |
| Image | Image | Purple | .jpg, .png, .gif, .svg |
| Video | Video | Pink | .mp4, .avi, .mov |
| Audio | Music | Yellow | .mp3, .wav, .ogg |
| Archive | Archive | Orange | .zip, .rar, .7z |
| Generic | File | Gray | Other types |

---

## 🔧 Configuration

### Firebase Storage Rules

You need to update your Firebase Storage security rules to allow uploads:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Allow authenticated users to upload to registratura
    match /registratura/{registrationNumber}/{allPaths=**} {
      allow read: if true; // Public read access
      allow write: if request.auth != null; // Authenticated write access
    }
  }
}
```

### Firestore Rules

Already configured in your previous setup. Make sure these are in place:

```javascript
match /registratura_emails/{document} {
  allow read, write: if true;
}

match /config/{document} {
  allow read, write: if true;
}
```

---

## 📊 Storage Structure

### Firebase Storage
```
/registratura
  /REG-2025-000001
    /attachments
      /document.pdf
      /photo.jpg
  /REG-2025-000002
    /attachments
      /invoice.xlsx
      /report.docx
```

### Firestore
```json
{
  "numarInregistrare": "REG-2025-000001",
  "from": "user@example.com",
  "subject": "Document Request",
  "attachments": [
    {
      "fileName": "document.pdf",
      "downloadURL": "https://firebasestorage.googleapis.com/...",
      "fileSize": 1548576,
      "fileType": "application/pdf",
      "uploadedAt": "2025-10-19T20:00:00Z"
    },
    {
      "fileName": "photo.jpg",
      "downloadURL": "https://firebasestorage.googleapis.com/...",
      "fileSize": 524288,
      "fileType": "image/jpeg",
      "uploadedAt": "2025-10-19T20:00:00Z"
    }
  ]
}
```

---

## 🧪 Testing

### Test Attachment Upload

1. **Send test email with attachments**:
   - Send email to your IMAP inbox
   - Include various file types (PDF, DOCX, images, etc.)
   - Attach multiple files (2-3 recommended)

2. **Sync emails**:
   - Navigate to: `http://localhost:9002/admin/registratura`
   - Click **"Verifică Email-uri"** button
   - Wait for success toast notification

3. **Verify in table view**:
   - Check that attachment count is displayed
   - Verify total size is shown correctly
   - Example: "2 fișiere (1.5 MB)"

4. **Verify in details modal**:
   - Click the **Eye icon** to view details
   - Scroll to **Atașamente** section
   - Verify:
     - ✅ Correct file icons
     - ✅ Proper colors by type
     - ✅ Accurate file sizes
     - ✅ Download buttons work

5. **Test download**:
   - Click **Descarcă** button for each attachment
   - Verify files open/download correctly

---

## 🔍 Troubleshooting

### Issue: "PERMISSION_DENIED" on Firebase Storage

**Cause**: Firebase Storage rules not configured

**Fix**: Update Storage rules (see Configuration section above)

### Issue: Attachments not showing in UI

**Possible Causes**:
1. Old email records without attachments
2. UI cache issue
3. Field name mismatch

**Fix**:
1. Send new test email with attachments
2. Sync via "Verifică Email-uri"
3. Hard refresh browser (Ctrl+Shift+R)

### Issue: File size shows as "0 Bytes"

**Cause**: Buffer content not properly passed

**Fix**: Check that `att.content` is a valid Buffer in email-service.ts

### Issue: Download URL returns 404

**Cause**: File not uploaded to Storage or URL expired

**Fix**:
1. Check Firebase Storage console
2. Verify file exists at path: `/registratura/{REG-NUMBER}/attachments/`
3. Check Storage rules allow read access

---

## 📈 Performance Considerations

### File Size Limits

**Recommended limits**:
- Maximum per file: **10 MB** (configurable)
- Maximum total per email: **25 MB** (configurable)

**To implement limits**, add to `registratura-service.ts`:

```typescript
async uploadAttachment(...) {
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

  if (file.length > MAX_FILE_SIZE) {
    throw new Error(`File too large: ${filename} (${file.length} bytes)`);
  }

  // Continue with upload...
}
```

### Supported MIME Types

Currently accepts all file types. To restrict, add validation:

```typescript
const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  // Add more as needed
];

if (!ALLOWED_TYPES.includes(contentType)) {
  throw new Error(`Unsupported file type: ${contentType}`);
}
```

---

## 🚀 Future Enhancements

Potential improvements (not yet implemented):

1. **Virus Scanning**: Integrate ClamAV or similar before upload
2. **Thumbnail Generation**: Generate thumbnails for images
3. **OCR Processing**: Extract text from PDFs for search
4. **Compression**: Compress images to reduce storage costs
5. **Batch Download**: Download all attachments as ZIP
6. **Preview Modal**: Preview PDF/images without downloading
7. **Attachment History**: Track who downloaded what and when

---

## 📚 Related Documentation

- [EMAIL_SYNC_SETUP.md](./EMAIL_SYNC_SETUP.md) - Email syncing setup
- [CLAUDE.md](./CLAUDE.md) - Overall project architecture
- [Firebase Storage Docs](https://firebase.google.com/docs/storage)
- [mailparser Docs](https://nodemailer.com/extras/mailparser/)

---

## ✅ Summary

**What's Working**:
- ✅ Attachment extraction from IMAP emails
- ✅ Upload to Firebase Storage with proper paths
- ✅ Metadata storage in Firestore
- ✅ Rich UI display with icons and colors
- ✅ Download functionality
- ✅ Error handling and logging
- ✅ Type-safe TypeScript implementation

**What You Need to Do**:
- 📋 Update Firebase Storage security rules (if not done)
- 🧪 Test with real emails containing attachments
- 📊 Monitor storage usage in Firebase Console

**Storage Paths**:
- Attachments: `/registratura/{REG-NUMBER}/attachments/{filename}`
- Metadata: `registratura_emails` collection in Firestore

---

For any issues, check the console logs for detailed error messages!
