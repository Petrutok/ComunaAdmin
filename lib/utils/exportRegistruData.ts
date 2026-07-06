import { RegistruDocument } from '@/lib/firebase';
import { TIP_DOCUMENT_CONFIG, STATUS_CONFIG } from '@/types/registru';

/**
 * Exports registry documents to CSV format
 */
export function exportToCSV(documents: RegistruDocument[]): void {
  // Prepare CSV headers
  const headers = [
    'Nr. Înregistrare',
    'Data Înregistrării',
    'Tip Document',
    'Emitent',
    'Email Emitent',
    'Destinatar',
    'Email Destinatar',
    'Status',
    'Departament',
    'Conținut Rezumat',
  ];

  // Prepare CSV rows
  const rows = documents.map(doc => [
    doc.numarInregistrare,
    formatDateForExport(doc.dataInregistrare),
    TIP_DOCUMENT_CONFIG[doc.tipDocument].label,
    doc.emitent,
    doc.emailEmitent || '',
    doc.destinatar,
    doc.emailDestinatar || '',
    STATUS_CONFIG[doc.status].label,
    doc.departament || '',
    doc.continut.substring(0, 100).replace(/"/g, '""'), // Escape quotes
  ]);

  // Combine headers and rows
  const csvContent = [
    headers.map(h => `"${h}"`).join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n');

  // Add BOM for UTF-8 encoding (fixes Romanian characters)
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

  // Create download link
  const link = document.createElement('a');
  const url = window.URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `registru_export_${new Date().getTime()}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Exports registry documents to Excel format (using CSV with .xlsx mimetype)
 */
export function exportToExcel(documents: RegistruDocument[]): void {
  // Use CSV format but with xlsx extension for better Excel compatibility
  // Create a more Excel-friendly structure
  const headers = [
    'Nr. Înregistrare',
    'Data Înregistrării',
    'Tip Document',
    'Emitent',
    'Email Emitent',
    'Adresă Emitent',
    'Destinatar',
    'Email Destinatar',
    'Adresă Destinatar',
    'Status',
    'Departament',
    'Conținut',
    'Observații',
    'Creat de',
  ];

  const rows = documents.map(doc => [
    doc.numarInregistrare,
    formatDateForExport(doc.dataInregistrare),
    TIP_DOCUMENT_CONFIG[doc.tipDocument].label,
    doc.emitent,
    doc.emailEmitent || '',
    doc.adresaEmitent || '',
    doc.destinatar,
    doc.emailDestinatar || '',
    doc.adresaDestinatar || '',
    STATUS_CONFIG[doc.status].label,
    doc.departament || '',
    doc.continut,
    doc.observatii || '',
    doc.creatDeNume || '',
  ]);

  // Create TSV (Tab-Separated Values) which Excel handles better
  const tsvContent = [
    headers.join('\t'),
    ...rows.map(row => row.map(cell => `${cell}`).join('\t')),
  ].join('\n');

  // Add BOM for UTF-8 encoding
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + tsvContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });

  // Create download link
  const link = document.createElement('a');
  const url = window.URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `registru_export_${new Date().getTime()}.xlsx`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Exports registry documents as JSON
 */
export function exportToJSON(documents: RegistruDocument[]): void {
  const dataToExport = documents.map(doc => ({
    numarInregistrare: doc.numarInregistrare,
    tipDocument: doc.tipDocument,
    dataInregistrare: formatDateForExport(doc.dataInregistrare),
    emitent: doc.emitent,
    emailEmitent: doc.emailEmitent || null,
    adresaEmitent: doc.adresaEmitent || null,
    destinatar: doc.destinatar,
    emailDestinatar: doc.emailDestinatar || null,
    adresaDestinatar: doc.adresaDestinatar || null,
    continut: doc.continut,
    status: doc.status,
    departament: doc.departament || null,
    observatii: doc.observatii || null,
    creatDe: doc.creatDe,
    creatDeNume: doc.creatDeNume,
  }));

  const jsonString = JSON.stringify(dataToExport, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });

  const link = document.createElement('a');
  const url = window.URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `registru_export_${new Date().getTime()}.json`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Generates statistics from registry documents
 */
export function generateStatistics(documents: RegistruDocument[]) {
  const now = new Date();
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const getDocDate = (timestamp: any): Date => {
    if (!timestamp) return new Date();
    return timestamp.toDate?.() || (timestamp instanceof Date ? timestamp : new Date());
  };

  const stats = {
    totalDocuments: documents.length,
    newDocuments: documents.filter(d => d.status === 'nou').length,
    inProgressDocuments: documents.filter(d => d.status === 'in_lucru').length,
    completedDocuments: documents.filter(d => d.status === 'finalizat').length,
    documentsThisMonth: documents.filter(doc => {
      const docDate = getDocDate(doc.dataInregistrare);
      return docDate >= thisMonth;
    }).length,
    documentsToday: documents.filter(doc => {
      const docDate = getDocDate(doc.dataInregistrare);
      const docDay = new Date(docDate.getFullYear(), docDate.getMonth(), docDate.getDate());
      return docDay.getTime() === today.getTime();
    }).length,
    documentsByType: {} as Record<string, number>,
    documentsByDepartment: {} as Record<string, number>,
  };

  // Count documents by type
  documents.forEach(doc => {
    const type = TIP_DOCUMENT_CONFIG[doc.tipDocument].label;
    stats.documentsByType[type] = (stats.documentsByType[type] || 0) + 1;
  });

  // Count documents by department
  documents.forEach(doc => {
    if (doc.departament) {
      stats.documentsByDepartment[doc.departament] =
        (stats.documentsByDepartment[doc.departament] || 0) + 1;
    }
  });

  return stats;
}

/**
 * Formats date for export
 */
function formatDateForExport(timestamp: any): string {
  if (!timestamp) return '';
  try {
    const date = timestamp.toDate?.() || new Date(timestamp);
    return date.toLocaleDateString('ro-RO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch (error) {
    return '';
  }
}

/**
 * Generates a summary report
 */
export function generateSummaryReport(documents: RegistruDocument[]): string {
  const stats = generateStatistics(documents);
  const now = new Date();

  let report = `RAPORT REGISTRU GENERAL\n`;
  report += `Generat: ${now.toLocaleDateString('ro-RO')} la ${now.toLocaleTimeString('ro-RO')}\n`;
  report += `\n`;
  report += `STATISTICI GENERALE:\n`;
  report += `- Total documente: ${stats.totalDocuments}\n`;
  report += `- Documente noi: ${stats.newDocuments}\n`;
  report += `- Documente în lucru: ${stats.inProgressDocuments}\n`;
  report += `- Documente finalizate: ${stats.completedDocuments}\n`;
  report += `- Documente luna aceasta: ${stats.documentsThisMonth}\n`;
  report += `- Documente astazi: ${stats.documentsToday}\n`;
  report += `\n`;

  if (Object.keys(stats.documentsByType).length > 0) {
    report += `DOCUMENTE PE TIP:\n`;
    Object.entries(stats.documentsByType).forEach(([type, count]) => {
      report += `- ${type}: ${count}\n`;
    });
    report += `\n`;
  }

  if (Object.keys(stats.documentsByDepartment).length > 0) {
    report += `DOCUMENTE PE DEPARTAMENT:\n`;
    Object.entries(stats.documentsByDepartment).forEach(([dept, count]) => {
      report += `- ${dept}: ${count}\n`;
    });
  }

  return report;
}
