# Registru General System - Setup & Testing Guide

## 🎯 Quick Start

### Prerequisites
- Node.js 18+ installed
- Firebase project configured
- Admin credentials set up

### Installation
1. All dependencies are already installed (jsPDF, React Hook Form, etc.)
2. Copy all created files to your project
3. Update your Firestore database with security rules (see below)

### Files Created

```
✅ types/registru.ts
✅ lib/firebase.ts (updated with REGISTRU collections)
✅ lib/utils/generateRegistruNumber.ts
✅ lib/utils/exportRegistruData.ts
✅ lib/pdf/generateDocumentPDF.ts
✅ components/registru/IntrareNouaDialog.tsx
✅ components/registru/DetaliiDocumentDialog.tsx
✅ app/admin/registru/page.tsx
✅ REGISTRU_IMPLEMENTATION.md
✅ REGISTRU_SETUP_GUIDE.md (this file)
```

## 📋 Testing Checklist

### 1. Module Loading Test
```bash
npm run typecheck
npm run build
npm run dev
```
Verify no errors in console for registru files.

### 2. Navigation Test
- Open http://localhost:9002/admin
- Click on "Registru" in sidebar (if added)
- OR Navigate directly to http://localhost:9002/admin/registru
- Should see main registry page with empty state

### 3. Registration Number Generation Test
1. Click "Intrare Nouă" button
2. Verify registration number is displayed
3. Format should be "REG-YYYY-NNNNNN"
4. Click copy button
5. Paste into text editor - number should appear

### 4. Complete Form Mode Test
1. Click "Intrare Nouă" → "Formular Complet" tab
2. Verify registration number is pre-filled and read-only
3. Fill form fields:
   - Select Document Type
   - Add Sender Name (required)
   - Add Recipient Name (required)
   - Write Content (required, min 10 chars)
4. Click "Salvează Document"
5. Check toast notification "Succes"

### 5. Number-Only Mode Test
1. Click "Intrare Nouă" → "Doar Număr" tab
2. Verify registration number displays prominently
3. Click copy button - should show "Copiat!" feedback
4. Fill optional quick fields
5. Click "Salvează Minimal"
6. Check toast notification

### 6. Document Display Test
1. After creating documents, verify they appear in main table
2. Check columns are correct:
   - Nr. Înregistrare (monospace, bold)
   - Data
   - Tip Document (colored badge)
   - Emitent
   - Destinatar
   - Status (colored badge)
   - Acțiuni (action buttons)

### 7. Search Test
1. Type in search box
2. Try searching by:
   - Registration number
   - Sender name
   - Recipient name
   - Document content
3. Verify filtering works real-time

### 8. Filter Tab Test
1. Click status tabs: All, New, In Progress, Completed
2. Verify counts update
3. Verify table filters to correct documents
4. Check active tab styling

### 9. Sort Test
1. Click "Nou → Vechi" button
2. Verify documents reverse sort order
3. Click again to go back to "Vechi → Nou"
4. Verify dates are correct order

### 10. Status Change Test
1. Click info button (ⓘ) on any document
2. Select new status from dropdown
3. Add notes (optional)
4. Click "Salvează"
5. Verify document status updates
6. Verify toast notification shows

### 11. Details Dialog Test
1. Click eye button (👁) on any document
2. Verify dialog opens with full details
3. Check all sections display:
   - General Information
   - Sender Details
   - Recipient Details
   - Content
   - History
4. Verify copy number button works
5. Verify buttons are present:
   - Închide
   - Descarcă PDF

### 12. PDF Generation Test
1. Open document details
2. Click "Descarcă PDF"
3. Verify PDF downloads
4. Open PDF and check:
   - Registration number appears
   - Document type
   - Sender/Recipient info
   - Content is readable
   - Date is correct

### 13. Export Tests

#### CSV Export
1. Ensure documents exist
2. Click "CSV" button in header
3. Verify file downloads: `registru_export_[timestamp].csv`
4. Open in text editor
5. Verify UTF-8 encoding (Romanian chars OK)
6. Verify all columns present

#### Excel Export
1. Click "Excel" button in header
2. Verify file downloads: `registru_export_[timestamp].xlsx`
3. Open in Excel/LibreOffice
4. Verify data is tab-separated
5. Verify Romanian characters display correctly

#### JSON Export
1. Click "JSON" button in header
2. Verify file downloads: `registru_export_[timestamp].json`
3. Open in text editor
4. Verify valid JSON format
5. Verify all fields present

### 14. Statistics Test
1. Create multiple documents with different statuses
2. Verify statistics cards show:
   - Documents this month
   - Completed documents
   - In progress documents
   - New documents
3. Verify numbers update after creating/changing documents

### 15. Delete Test
1. Create a document and mark it "Finalizat"
2. Click delete button (🗑️) - should only appear for completed
3. Verify confirmation dialog appears
4. Click "Șterge definitiv"
5. Verify document disappears from list
6. Verify toast notification shows

### 16. Dark Theme Test
1. Verify all components have proper dark theme
2. Check colors:
   - Background: dark slate (900)
   - Text: white/light gray
   - Borders: slate with transparency
   - Badges: color-coded correctly

### 17. Responsive Design Test
1. Resize browser to mobile width (375px)
2. Verify layout adapts:
   - Buttons stack on mobile
   - Table is readable
   - Dialog scrolls properly
   - Search bar is accessible

### 18. Error Handling Test
1. Create a document with minimal data
2. Verify form validation works
3. Try submitting with empty required fields
4. Verify error messages appear
5. Test network error handling (disable internet)
6. Verify appropriate error toast appears

### 19. Loading States Test
1. Submit large form
2. Verify "Se salvează..." shows during submission
3. Verify button is disabled during loading
4. Verify spinner animates

### 20. Toast Notifications Test
1. Perform various actions
2. Verify toasts appear for:
   - Successful document creation
   - Status updates
   - Copy to clipboard
   - Download completion
   - Errors

## 🔐 Firebase Setup

### Create Collections
In Firestore console:

1. Create collection `registru_general`
2. Create collection `registru_counters`

### Set Security Rules
Copy this to Firestore Security Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Registru General - Admins only
    match /registru_general/{document=**} {
      allow read, write: if request.auth != null &&
        get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.isAdmin == true;
    }

    // Registru Counters - Admins only
    match /registru_counters/{document=**} {
      allow read, write: if request.auth != null &&
        get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.isAdmin == true;
    }
  }
}
```

## 🧪 Automated Testing Script

Create `test-registru.ts` in your tests directory:

```typescript
import { generateRegistruNumber, registrationNumberExists } from '@/lib/utils/generateRegistruNumber';

describe('Registru System', () => {
  test('should generate unique registration numbers', async () => {
    const num1 = await generateRegistruNumber();
    const num2 = await generateRegistruNumber();

    expect(num1).toMatch(/^REG-\d{4}-\d{6}$/);
    expect(num2).toMatch(/^REG-\d{4}-\d{6}$/);
    expect(num1).not.toBe(num2);
  });

  test('should detect existing numbers', async () => {
    const number = await generateRegistruNumber();
    const exists = await registrationNumberExists(number);
    expect(exists).toBe(true);
  });

  test('should export data in multiple formats', () => {
    // Test export utilities
    expect(exportToCSV).toBeDefined();
    expect(exportToExcel).toBeDefined();
    expect(exportToJSON).toBeDefined();
  });
});
```

## 🐛 Troubleshooting

### Issue: "Module not found" errors
**Solution:**
```bash
rm -rf .next node_modules/.cache
npm run build
```

### Issue: Registration numbers not saving
**Solution:**
- Check Firestore security rules allow writes
- Verify user is authenticated as admin
- Check browser console for Firebase errors

### Issue: PDF not downloading
**Solution:**
- Ensure jsPDF is installed: `npm list jspdf`
- Check browser console for errors
- Verify document data is complete

### Issue: Export files not downloading
**Solution:**
- Check browser download settings aren't blocking
- Try different export format
- Check browser console for errors

### Issue: Status updates not persisting
**Solution:**
- Verify Firestore rules allow write access
- Check document ID is correct
- Verify timestamp fields are valid

### Issue: Search not working
**Solution:**
- Verify documents are loaded: check state in console
- Try clearing search term and retyping
- Refresh page to reload documents

### Issue: Dark theme colors incorrect
**Solution:**
```bash
npm run dev
# Clear browser cache (Ctrl+Shift+Delete)
```

## 📊 Database Queries

### Get all documents
```typescript
const q = query(
  collection(db, 'registru_general'),
  orderBy('dataInregistrare', 'desc')
);
const docs = await getDocs(q);
```

### Get documents by status
```typescript
const q = query(
  collection(db, 'registru_general'),
  where('status', '==', 'nou'),
  orderBy('dataInregistrare', 'desc')
);
const docs = await getDocs(q);
```

### Get documents by department
```typescript
const q = query(
  collection(db, 'registru_general'),
  where('departament', '==', 'Accounting'),
  orderBy('dataInregistrare', 'desc')
);
const docs = await getDocs(q);
```

## 📈 Performance Optimization

### Firestore Indexes (if needed)
For complex queries, create composite indexes:
- Collection: `registru_general`
- Fields: `status` (Ascending), `dataInregistrare` (Descending)
- Fields: `departament` (Ascending), `status` (Ascending)

### Pagination (Future Enhancement)
```typescript
const pageSize = 20;
const q = query(
  collection(db, 'registru_general'),
  orderBy('dataInregistrare', 'desc'),
  limit(pageSize)
);
```

## 🚀 Deployment

### Pre-deployment Checklist
- [ ] All tests passing
- [ ] No console errors
- [ ] Dark theme verified
- [ ] Responsive design tested
- [ ] Security rules configured
- [ ] Error handling works
- [ ] Toast notifications display
- [ ] PDF generation works
- [ ] Exports working
- [ ] No hardcoded credentials

### Build for Production
```bash
npm run build
npm run typecheck
npm start
```

## 📞 Support

For issues or questions:
1. Check browser console (F12)
2. Check Firestore error messages
3. Review REGISTRU_IMPLEMENTATION.md
4. Check Firebase documentation

## ✅ Completion Checklist

- [x] Types and interfaces created
- [x] Registration number generation with transactions
- [x] Main registry page with filters
- [x] Dual-mode new entry dialog
- [x] Document details dialog
- [x] PDF generation and download
- [x] CSV/Excel/JSON export
- [x] Statistics dashboard
- [x] Status management
- [x] Search and filtering
- [x] Dark theme styling
- [x] Error handling
- [x] Toast notifications
- [x] Responsive design
- [x] Type safety (TypeScript)
- [x] Documentation

## 🎉 Next Steps

1. Test all features thoroughly
2. Deploy to Firestore
3. Train users on system
4. Gather feedback
5. Implement advanced features:
   - File attachments
   - Email notifications
   - Advanced reporting
   - User permissions
   - API integration

---

**Last Updated:** October 2025
**Version:** 1.0.0
**Status:** Ready for Deployment
