# Registru General Implementation Guide

## Overview

A complete **General Registry System** for the "Primăria Digitală" application, inspired by the REGIT platform. The system handles document registration with dual-mode operation: complete form submission and quick number generation for manually-created documents.

## Features Implemented

### ✅ Core Features

1. **Dual Registration Modes**
   - **Complete Form**: Full document details with sender/recipient information
   - **Number Only**: Quick registration number generation for pre-created documents

2. **Registration Number Generation**
   - Automatic format: `REG-YYYY-NNNNNN` (e.g., `REG-2025-000123`)
   - Unique per year with sequential numbering
   - Race condition handling using Firestore transactions
   - Copy-to-clipboard functionality

3. **Document Management**
   - Full CRUD operations for documents
   - Status workflow: New → In Progress → Completed
   - Filter by status with tab navigation
   - Global search across multiple fields
   - Sort by date (New → Old / Old → New)

4. **Document Types** (with color-coded badges)
   - Adresă (Address)
   - Dispoziție (Disposition)
   - Hotărâre (Decision)
   - Raport (Report)
   - Cerere (Request)
   - Notificare (Notification)
   - Proces Verbal (Minutes)
   - Notă Internă (Internal Note)
   - Altele (Others)

5. **Status Management**
   - Nou (New) - Blue
   - În Lucru (In Progress) - Amber
   - Finalizat (Completed) - Green
   - Status updates with optional notes

6. **PDF Generation**
   - Professional document PDFs using jsPDF
   - Includes registration number, dates, parties, content
   - One-click download from document details

7. **Data Export**
   - CSV export with UTF-8 BOM for Romanian characters
   - Excel export (TSV format)
   - JSON export for integration
   - Exports respect current filters

8. **Statistics Dashboard**
   - Documents this month
   - Completed documents count
   - In-progress documents count
   - New documents count
   - Documents by type breakdown
   - Documents by department breakdown

9. **Advanced Features**
   - Document details dialog with full information
   - Attachments support (placeholder for future file uploads)
   - Department assignment
   - Internal notes and observations
   - Created by/timestamp tracking
   - Delete confirmation for completed documents only

## File Structure

```
types/
└── registru.ts                    # Types and configurations

lib/
├── firebase.ts                    # Updated with REGISTRU collections
├── utils/
│   ├── generateRegistruNumber.ts  # Auto-increment number generation
│   └── exportRegistruData.ts      # CSV/Excel/JSON export utilities
└── pdf/
    └── generateDocumentPDF.ts     # PDF generation

components/registru/
├── IntrareNouaDialog.tsx          # New entry dialog (2 tabs)
└── DetaliiDocumentDialog.tsx      # Document details view

app/admin/registru/
└── page.tsx                       # Main registry page
```

## Database Collections

### `registru_general`
Main collection storing all registry documents.

**Document Structure:**
```javascript
{
  numarInregistrare: "REG-2025-000123",
  tipDocument: "adresa",
  dataInregistrare: Timestamp,
  dataExterna: "25.10.2025",
  numarExtern: "123/2025",

  emitent: "Ion Popescu",
  adresaEmitent: "Main St. No. 1",
  emailEmitent: "ion@email.com",

  destinatar: "City Hall",
  adresaDestinatar: "Regina Elisabeta Blvd. 47",
  emailDestinatar: "contact@primaria.ro",

  continut: "Document content here...",
  observatii: "Internal notes",
  departament: "Accounting",

  status: "nou",
  creatDe: "admin_user_id",
  creatDeNume: "Administrator Name",
  createdAt: Timestamp,
  updatedAt: Timestamp,

  attachments: [
    {
      fileName: "doc.pdf",
      downloadURL: "gs://...",
      fileSize: 1024,
      fileType: "application/pdf"
    }
  ]
}
```

### `registru_counters`
Tracks sequential numbers per year for unique registration number generation.

**Document Structure:**
```javascript
{
  "2025": {
    year: 2025,
    lastNumber: 123
  },
  "2026": {
    year: 2026,
    lastNumber: 1
  }
}
```

## Components Overview

### 1. IntrareNouaDialog.tsx
**Two-Tab Dialog System:**

**Tab 1: Complete Form**
- Auto-generated registration number
- Document type selection
- External document number/date (optional)
- Sender details (name, address, email)
- Recipient details (name, address, email)
- Document content (required, 2500 char limit)
- Department assignment
- Internal notes
- File attachments (future)

**Tab 2: Number Only**
- Displays generated registration number
- Copy-to-clipboard with visual feedback
- Quick optional details:
  - Document type
  - Sender name
  - Recipient name
  - Brief description
- Minimal data requirement

### 2. DetaliiDocumentDialog.tsx
**Full Document View:**
- Registration number with copy button
- Status and type badges
- General information card
- Sender details card
- Recipient details card
- Full content display
- Observations/notes
- Attachments section
- History timeline
- Download PDF button

### 3. Main Registry Page (page.tsx)
**Features:**
- Header with document statistics
- Export buttons (CSV, Excel, JSON)
- Statistics dashboard cards
- Search with real-time filtering
- Status filter tabs with counts
- Sort button (New → Old / reverse)
- Data table with columns:
  - Registration number (monospace, bold)
  - Date registered
  - Document type (colored badge)
  - Sender name
  - Recipient name
  - Status badge
  - Action buttons

**Action Buttons:**
- View details
- Change status
- Delete (completed only)

## API Utilities

### generateRegistruNumber.ts

```typescript
// Auto-generate next registration number
const number = await generateRegistruNumber();

// Get last number for a year
const lastNum = await getLastRegistrationNumber(2025);

// Check if number exists
const exists = await registrationNumberExists("REG-2025-000123");

// Generate multiple numbers
const numbers = await generateMultipleRegistruNumbers(5);
```

### exportRegistruData.ts

```typescript
// Export functions
exportToCSV(documents);        // Download CSV file
exportToExcel(documents);      // Download Excel (TSV)
exportToJSON(documents);       // Download JSON file

// Statistics
const stats = generateStatistics(documents);
// Returns: totalDocuments, newDocuments, inProgressDocuments,
//          completedDocuments, documentsThisMonth, documentsToday,
//          documentsByType, documentsByDepartment

// Report generation
const report = generateSummaryReport(documents);
```

### generateDocumentPDF.ts

```typescript
// Generate PDF as blob
const blob = await generateDocumentPDF(document);

// Download PDF
await downloadDocumentPDF(document);

// Save to Firebase Storage
const path = await savePDFToFirebase(document, "path/in/storage");
```

## Usage Examples

### Creating a Complete Document
1. Click "Intrare Nouă"
2. Select "Formular Complet" tab
3. Registration number is auto-generated
4. Fill all required fields (marked with *)
5. Add optional sender/recipient details
6. Write document content
7. Assign department
8. Click "Salvează Document"

### Quick Number Generation
1. Click "Intrare Nouă"
2. Select "Doar Număr" tab
3. Registration number appears automatically
4. Copy number to clipboard
5. Optional: Add minimal details
6. Click "Salvează Minimal"

### Document Workflow
1. New documents appear in "Nou" tab
2. Click status button to change status
3. Add notes during processing
4. Mark as "Finalizat" when complete
5. Delete option appears only for completed documents

### Exporting Data
1. Filter documents as needed
2. Click CSV/Excel/JSON button
3. File downloads automatically
4. Includes filtered data only

## Styling & Theme

- **Dark Theme**: bg-slate-800/900, text-white
- **Status Colors**:
  - New: Blue (bg-blue-600)
  - In Progress: Amber (bg-amber-600)
  - Completed: Emerald (bg-emerald-600)
- **Document Type Colors**: Each type has unique color scheme
- **Responsive**: Mobile-friendly layout

## Security Considerations

### Firebase Security Rules (Recommended)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Registru General Collection
    match /registru_general/{document=**} {
      // Only admins can read/write
      allow read, write: if request.auth != null &&
        get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.isAdmin == true;
    }

    // Registru Counters Collection
    match /registru_counters/{document=**} {
      // Only admins can write (for number generation)
      allow read: if request.auth != null &&
        get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.isAdmin == true;
      allow write: if request.auth != null &&
        get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.isAdmin == true;
    }
  }
}
```

## Testing Checklist

- [x] Registration number generation is unique and sequential
- [x] Number generation handles race conditions
- [x] Document save with complete form
- [x] Document save with number-only mode
- [x] Copy number to clipboard
- [x] Search filters documents correctly
- [x] Status filter tabs work
- [x] Sort order works (both directions)
- [x] Status change with notes
- [x] Delete confirmation appears
- [x] PDF generation and download
- [x] CSV export
- [x] Excel export
- [x] JSON export
- [x] Statistics calculation
- [x] Details dialog displays all information
- [x] Date formatting is correct
- [x] Dark theme applied consistently
- [x] Responsive on mobile
- [x] Toast notifications appear
- [x] Loading states show

## Dependencies Used

- `jspdf` - PDF generation (already in package.json)
- `firebase` - Database and authentication
- `react-hook-form` - Form handling
- `zod` - Schema validation
- `lucide-react` - Icons
- `shadcn/ui` - UI components
- `tailwindcss` - Styling

## Future Enhancements

1. **File Attachments**
   - Upload documents to Firebase Storage
   - Display attachments in details view
   - Download capability

2. **Advanced Filtering**
   - Filter by department
   - Filter by document type (multiple select)
   - Date range picker
   - Combined filters

3. **Notifications**
   - Email notifications on status change
   - Admin dashboard alerts
   - Deadline warnings

4. **User Management**
   - Assign documents to users
   - User workflow tracking
   - Department hierarchy

5. **Search Enhancement**
   - Full-text search with highlighting
   - Advanced search with operators
   - Saved search filters

6. **Reporting**
   - Advanced statistics dashboard
   - Custom report generation
   - Export to PDF report

7. **Audit Trail**
   - Full history of changes
   - Who changed what and when
   - Revert capability for admins

8. **Integration**
   - Link with email system
   - Integration with other modules
   - API endpoints for external systems

## Troubleshooting

### Registration numbers not generating
- Check Firestore has write permission to `registru_counters`
- Verify user is authenticated as admin
- Check browser console for errors

### PDFs not downloading
- Ensure jsPDF is properly imported
- Check browser allows downloads
- Verify document data is complete

### Export files not downloading
- Check browser download settings
- Ensure data exists to export
- Verify UTF-8 BOM is being sent

### Styling issues
- Clear Next.js cache: `rm -rf .next`
- Rebuild Tailwind: `npm run dev`
- Check dark mode is enabled in tailwind.config.js

## Support & Documentation

For questions or issues, refer to:
- Project documentation in CLAUDE.md
- Firebase documentation: https://firebase.google.com/docs
- React Hook Form: https://react-hook-form.com
- jsPDF: https://github.com/parallax/jsPDF

---

**Last Updated**: October 2025
**Version**: 1.0.0
**Status**: Production Ready
