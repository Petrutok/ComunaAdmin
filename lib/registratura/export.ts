// lib/registratura/export.ts
// CSV export for the registry list (Excel-compatible: UTF-8 BOM keeps
// Romanian diacritics intact when opened in Excel).

import { RegistraturaEmail, EMAIL_STATUS_CONFIG } from '@/types/registratura';

function csvCell(value: unknown): string {
  const s = String(value ?? '');
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function exportEmailsCsv(emails: RegistraturaEmail[], filename?: string): void {
  const header = [
    'Nr. înregistrare', 'Data primirii', 'Expeditor', 'Subiect',
    'Status', 'Prioritate', 'Compartiment', 'Responsabil',
    'Termen', 'Etichete', 'Observații',
  ];

  const rows = emails.map((e) => [
    e.numarInregistrare,
    e.dateReceived?.toDate?.()?.toLocaleDateString('ro-RO') || '',
    e.from,
    e.subject || '',
    EMAIL_STATUS_CONFIG[e.status]?.label || e.status,
    e.priority || 'normal',
    e.departmentName || '',
    e.assignedToUserName || '',
    e.deadline?.toDate?.()?.toLocaleDateString('ro-RO') || '',
    (e.etichete || []).join(', '),
    e.observatii || '',
  ]);

  const csv = [header, ...rows].map((row) => row.map(csvCell).join(';')).join('\r\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });

  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename || `registratura-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}
