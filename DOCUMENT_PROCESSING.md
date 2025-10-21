# Document Processing System

This document describes the Regista-style document processing system for the Registratură Electronică.

## Overview

The document processing system provides the following capabilities:

1. **File to PDF Conversion** - Converts images and text files to PDF format
2. **Registration Stamp Generation** - Creates professional stamps with QR codes
3. **PDF Stamping** - Applies registration stamps to PDF documents
4. **Batch Processing** - Processes multiple documents simultaneously
5. **Firebase Storage Integration** - Uploads processed documents

## Installation

### Required Packages

```bash
npm install pdf-lib canvas qrcode
npm install -D @types/qrcode
```

### System Dependencies (macOS)

If you encounter issues with the `canvas` package, install system dependencies:

```bash
brew install pkg-config cairo pango libpng jpeg giflib librsvg
```

## Architecture

### Services

1. **stamp-generator.ts** - Generates registration stamps with QR codes
2. **file-to-pdf-converter.ts** - Converts various file formats to PDF
3. **pdf-stamper.ts** - Applies stamps to PDF documents
4. **document-processor.ts** - Main integration service

### API Routes

- **POST /api/registratura/process-document** - Processes email attachments

## Usage Examples

### 1. Basic Document Processing

```typescript
import { processDocument } from '@/lib/services/document-processor';

const result = await processDocument(
  fileBuffer,
  'document.jpg',
  'image/jpeg',
  {
    registrationNumber: 'REG-2025-000123',
    dateReceived: new Date(),
    organizationName: 'PRIMĂRIA DIGITALĂ',
    departmentName: 'Departamentul Juridic',
    uploadToStorage: true,
  }
);

if (result.success) {
  console.log('Processed PDF URL:', result.downloadURL);
  console.log('File size:', result.fileSize);
  console.log('Page count:', result.pageCount);
}
```

### 2. Batch Processing Multiple Attachments

```typescript
import { processDocumentBatch } from '@/lib/services/document-processor';

const files = [
  { buffer: buffer1, fileName: 'doc1.pdf', fileType: 'application/pdf' },
  { buffer: buffer2, fileName: 'image.jpg', fileType: 'image/jpeg' },
  { buffer: buffer3, fileName: 'text.txt', fileType: 'text/plain' },
];

const results = await processDocumentBatch(files, {
  registrationNumber: 'REG-2025-000123',
  dateReceived: new Date(),
  uploadToStorage: true,
});

// Get summary statistics
import { getProcessingSummary } from '@/lib/services/document-processor';
const summary = getProcessingSummary(results);
console.log(`Processed ${summary.successful}/${summary.total} files`);
```

### 3. Process Existing Firebase Storage File

```typescript
import { processStorageFile } from '@/lib/services/document-processor';

const result = await processStorageFile(
  'https://firebasestorage.googleapis.com/...',
  'attachment.pdf',
  'application/pdf',
  {
    registrationNumber: 'REG-2025-000123',
    dateReceived: new Date(),
    stampPosition: 'top-right',
    stampAllPages: false,
    uploadToStorage: true,
  }
);
```

### 4. Generate Registration Stamp Only

```typescript
import { generateRegistrationStamp } from '@/lib/services/stamp-generator';

const stampBuffer = await generateRegistrationStamp(
  {
    registrationNumber: 'REG-2025-000123',
    dateReceived: new Date(),
    organizationName: 'PRIMĂRIA DIGITALĂ',
    departmentName: 'Departamentul Juridic',
    trackingUrl: 'https://primaria.digital/track/REG-2025-000123',
  },
  {
    width: 250,
    height: 150,
    qrSize: 80,
  }
);

// stampBuffer is a PNG image
```

### 5. Stamp Existing PDF

```typescript
import { stampPdf } from '@/lib/services/pdf-stamper';

const result = await stampPdf(pdfBuffer, {
  registrationNumber: 'REG-2025-000123',
  dateReceived: new Date(),
  organizationName: 'PRIMĂRIA DIGITALĂ',
}, {
  position: 'top-right',
  allPages: false,
  opacity: 1,
});

if (result.success) {
  // result.pdfBuffer contains the stamped PDF
}
```

### 6. Convert File to PDF

```typescript
import { convertToPdf, isConvertibleToPdf } from '@/lib/services/file-to-pdf-converter';

if (isConvertibleToPdf(fileType)) {
  const result = await convertToPdf(fileBuffer, fileType, fileName);

  if (result.success) {
    console.log('PDF created with', result.pageCount, 'pages');
    // result.pdfBuffer contains the PDF
  }
}
```

### 7. Using the API Route

```typescript
// Client-side call
const response = await fetch('/api/registratura/process-document', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    emailId: 'abc123',
    registrationNumber: 'REG-2025-000123',
    dateReceived: new Date().toISOString(),
    organizationName: 'PRIMĂRIA DIGITALĂ',
    departmentName: 'Departamentul Juridic',
    attachments: [
      {
        downloadURL: 'https://firebasestorage.googleapis.com/...',
        fileName: 'document.pdf',
        fileType: 'application/pdf',
      },
    ],
    stampAllPages: false,
    stampPosition: 'top-right',
  }),
});

const data = await response.json();

if (data.success) {
  console.log('Summary:', data.summary);
  console.log('Results:', data.results);
}
```

## Supported File Types

### Fully Supported
- **PDF** - application/pdf (no conversion needed)
- **Images** - image/jpeg, image/jpg, image/png, image/gif, image/bmp
- **Text** - text/plain, text/html, text/csv

### Not Supported
- Microsoft Office files (Word, Excel, PowerPoint)
- Compressed archives (ZIP, RAR)
- Audio/Video files

## Configuration Options

### StampConfig

```typescript
interface StampConfig {
  registrationNumber: string;     // Required: REG-2025-000123
  dateReceived: Date;             // Required: Timestamp
  organizationName?: string;      // Optional: Organization name
  departmentName?: string;        // Optional: Department name
  trackingUrl?: string;           // Optional: URL for QR code
}
```

### StampOptions

```typescript
interface StampOptions {
  width?: number;                 // Default: 250px
  height?: number;                // Default: 150px
  backgroundColor?: string;       // Default: white
  borderColor?: string;           // Default: #1e40af
  textColor?: string;             // Default: #1e293b
  qrSize?: number;                // Default: 80px
  fontSize?: {
    title?: number;               // Default: 14
    regNumber?: number;           // Default: 18
    date?: number;                // Default: 12
    department?: number;          // Default: 10
  };
}
```

### PdfStampOptions

```typescript
interface PdfStampOptions {
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  stampOptions?: StampOptions;
  margin?: number;                // Default: 20px from edges
  opacity?: number;               // Default: 1 (0-1 range)
  allPages?: boolean;             // Default: false (first page only)
}
```

### DocumentProcessingOptions

```typescript
interface DocumentProcessingOptions {
  registrationNumber: string;     // Required
  dateReceived: Date;             // Required
  organizationName?: string;
  departmentName?: string;
  trackingUrl?: string;
  stampPosition?: StampPosition;
  stampAllPages?: boolean;
  uploadToStorage?: boolean;      // Upload to Firebase Storage
  storagePath?: string;           // Custom storage path
}
```

## Integration with Email Sync

The document processing system integrates with the existing email sync workflow:

1. Email is fetched via IMAP
2. Attachments are uploaded to Firebase Storage
3. Email document is created in Firestore
4. **New**: Process attachments via `/api/registratura/process-document`
5. Processed PDFs are stored with registration stamps
6. Original attachments remain unchanged

### Example Integration

```typescript
// After email sync completes
import { processDocumentBatch } from '@/lib/services/document-processor';

async function processEmailAttachments(email: RegistraturaEmail) {
  if (!email.attachments || email.attachments.length === 0) {
    return;
  }

  const files = email.attachments.map(att => ({
    buffer: null, // Not needed, will fetch from URL
    fileName: att.fileName,
    fileType: att.fileType,
  }));

  // Call API to process
  const response = await fetch('/api/registratura/process-document', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      emailId: email.id,
      registrationNumber: email.numarInregistrare,
      dateReceived: email.dateReceived.toDate().toISOString(),
      departmentName: email.departmentName,
      attachments: email.attachments.map(att => ({
        downloadURL: att.downloadURL,
        fileName: att.fileName,
        fileType: att.fileType,
      })),
    }),
  });

  const result = await response.json();
  return result;
}
```

## Error Handling

All services return result objects with `success` boolean and optional `error` string:

```typescript
interface ProcessingResult {
  success: boolean;
  originalFileName: string;
  processedPdfBuffer?: Buffer;
  downloadURL?: string;
  fileSize?: number;
  pageCount?: number;
  wasConverted: boolean;
  wasStamped: boolean;
  error?: string;
  storagePath?: string;
}
```

Always check `success` before using the result:

```typescript
const result = await processDocument(...);

if (!result.success) {
  console.error('Processing failed:', result.error);
  // Handle error
} else {
  // Use result.processedPdfBuffer or result.downloadURL
}
```

## Performance Considerations

1. **Canvas Package**: Requires native dependencies, may be slow for large images
2. **PDF Processing**: Memory intensive for large PDFs or batches
3. **Firebase Storage**: Upload speed depends on file size and network
4. **Batch Processing**: Processes files sequentially, not in parallel

### Recommendations

- Process attachments asynchronously after email sync
- Limit batch size to 10 files at a time
- Use background jobs for large batches
- Cache processed documents to avoid reprocessing

## Security Considerations

1. **File Type Validation**: Always validate MIME types before processing
2. **File Size Limits**: Implement limits to prevent resource exhaustion
3. **Storage Permissions**: Ensure Firebase Storage rules are properly configured
4. **API Authentication**: Protect API routes with authentication

## Troubleshooting

### Canvas Installation Issues

If `canvas` fails to install on macOS:

```bash
brew install pkg-config cairo pango libpng jpeg giflib librsvg
npm rebuild canvas
```

### PDF Generation Fails

- Check file type is supported
- Verify buffer is not empty
- Check available memory for large files

### QR Code Not Appearing

- Ensure `trackingUrl` is provided in `StampConfig`
- Check QR code library is properly installed
- Verify canvas can render images

### Firebase Upload Fails

- Check Firebase Storage rules
- Verify storage path doesn't contain invalid characters
- Check file size against Firebase limits (max 5GB)

## Future Enhancements

Potential improvements for future versions:

1. **OCR Support**: Extract text from images
2. **Office File Support**: Convert .docx, .xlsx to PDF
3. **Digital Signatures**: Add cryptographic signatures
4. **Watermarking**: Add watermarks to all pages
5. **Parallel Processing**: Process multiple files concurrently
6. **Progress Tracking**: Real-time progress updates
7. **Compression**: Optimize PDF file sizes
8. **Metadata Extraction**: Extract and store document metadata

## License

Part of Primăria Digitală platform.
