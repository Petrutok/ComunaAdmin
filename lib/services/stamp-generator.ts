/**
 * PDF Stamp Generator Service
 * Generates registration stamps with QR codes for document tracking
 */

import QRCode from 'qrcode';
import { createCanvas } from 'canvas';

export interface StampConfig {
  registrationNumber: string; // REG-2025-000123
  dateReceived: Date;
  organizationName?: string;
  departmentName?: string;
  trackingUrl?: string; // URL for QR code (optional)
}

export interface StampOptions {
  width?: number; // Default: 250
  height?: number; // Default: 150
  backgroundColor?: string; // Default: white
  borderColor?: string; // Default: #1e40af (blue-800)
  textColor?: string; // Default: #1e293b (slate-800)
  qrSize?: number; // Default: 80
  fontSize?: {
    title?: number; // Default: 14
    regNumber?: number; // Default: 18
    date?: number; // Default: 12
    department?: number; // Default: 10
  };
}

/**
 * Generates a registration stamp as a PNG buffer
 * @param config - Stamp configuration
 * @param options - Visual options for customization
 * @returns PNG image buffer
 */
export async function generateRegistrationStamp(
  config: StampConfig,
  options: StampOptions = {}
): Promise<Buffer> {
  // Default options
  const width = options.width || 250;
  const height = options.height || 150;
  const bgColor = options.backgroundColor || '#ffffff';
  const borderColor = options.borderColor || '#1e40af';
  const textColor = options.textColor || '#1e293b';
  const qrSize = options.qrSize || 80;
  const fontSize = {
    title: options.fontSize?.title || 14,
    regNumber: options.fontSize?.regNumber || 18,
    date: options.fontSize?.date || 12,
    department: options.fontSize?.department || 10,
  };

  // Create canvas
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, width, height);

  // Border
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 3;
  ctx.strokeRect(0, 0, width, height);

  // Inner border
  ctx.lineWidth = 1;
  ctx.strokeRect(5, 5, width - 10, height - 10);

  // Generate QR Code if tracking URL is provided
  let qrDataUrl: string | null = null;
  if (config.trackingUrl) {
    try {
      qrDataUrl = await QRCode.toDataURL(config.trackingUrl, {
        width: qrSize,
        margin: 1,
        color: {
          dark: textColor,
          light: bgColor,
        },
      });
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  }

  // Layout calculations
  const padding = 15;
  const leftColumnX = padding;
  const rightColumnX = width - qrSize - padding;
  let currentY = padding + 5;

  // Title
  ctx.fillStyle = textColor;
  ctx.font = `bold ${fontSize.title}px Arial`;
  ctx.textAlign = 'left';
  const orgName = config.organizationName || 'PRIMĂRIA DIGITALĂ';
  ctx.fillText(orgName, leftColumnX, currentY);
  currentY += fontSize.title + 5;

  // Separator line
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(leftColumnX, currentY);
  ctx.lineTo(width - padding, currentY);
  ctx.stroke();
  currentY += 10;

  // Registration Number (large, bold)
  ctx.font = `bold ${fontSize.regNumber}px Arial`;
  ctx.fillStyle = borderColor;
  ctx.fillText(config.registrationNumber, leftColumnX, currentY);
  currentY += fontSize.regNumber + 8;

  // Date received
  ctx.font = `${fontSize.date}px Arial`;
  ctx.fillStyle = textColor;
  const dateStr = config.dateReceived.toLocaleDateString('ro-RO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const timeStr = config.dateReceived.toLocaleTimeString('ro-RO', {
    hour: '2-digit',
    minute: '2-digit',
  });
  ctx.fillText(`Data: ${dateStr}`, leftColumnX, currentY);
  currentY += fontSize.date + 5;
  ctx.fillText(`Ora: ${timeStr}`, leftColumnX, currentY);
  currentY += fontSize.date + 5;

  // Department (if provided)
  if (config.departmentName) {
    ctx.font = `${fontSize.department}px Arial`;
    ctx.fillStyle = textColor;
    // Wrap department name if too long
    const maxWidth = qrDataUrl ? rightColumnX - leftColumnX - 10 : width - 2 * padding;
    const words = config.departmentName.split(' ');
    let line = '';

    for (const word of words) {
      const testLine = line + (line ? ' ' : '') + word;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth) {
        if (line) {
          ctx.fillText(line, leftColumnX, currentY);
          currentY += fontSize.department + 3;
        }
        line = word;
      } else {
        line = testLine;
      }
    }
    if (line) {
      ctx.fillText(line, leftColumnX, currentY);
    }
  }

  // Draw QR Code in top right corner if available
  if (qrDataUrl) {
    try {
      const { loadImage } = await import('canvas');
      const img = await loadImage(qrDataUrl);
      ctx.drawImage(img, rightColumnX, padding + 10, qrSize, qrSize);
    } catch (error) {
      console.error('Error loading QR code image:', error);
      // Continue without QR code if there's an error
    }
  }

  // Convert to PNG buffer
  return canvas.toBuffer('image/png');
}

/**
 * Generates a simple text-based stamp (fallback if canvas is not available)
 * @param config - Stamp configuration
 * @returns Base64 encoded SVG stamp
 */
export function generateSimpleStamp(config: StampConfig): string {
  const dateStr = config.dateReceived.toLocaleDateString('ro-RO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const timeStr = config.dateReceived.toLocaleTimeString('ro-RO', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const svg = `
    <svg width="250" height="150" xmlns="http://www.w3.org/2000/svg">
      <rect width="250" height="150" fill="white" stroke="#1e40af" stroke-width="3"/>
      <rect x="5" y="5" width="240" height="140" fill="none" stroke="#1e40af" stroke-width="1"/>

      <text x="15" y="25" font-family="Arial" font-size="14" font-weight="bold" fill="#1e293b">
        ${config.organizationName || 'PRIMĂRIA DIGITALĂ'}
      </text>

      <line x1="15" y1="30" x2="235" y2="30" stroke="#1e40af" stroke-width="1"/>

      <text x="15" y="55" font-family="Arial" font-size="18" font-weight="bold" fill="#1e40af">
        ${config.registrationNumber}
      </text>

      <text x="15" y="75" font-family="Arial" font-size="12" fill="#1e293b">
        Data: ${dateStr}
      </text>

      <text x="15" y="92" font-family="Arial" font-size="12" fill="#1e293b">
        Ora: ${timeStr}
      </text>

      ${config.departmentName ? `
      <text x="15" y="110" font-family="Arial" font-size="10" fill="#1e293b">
        ${config.departmentName}
      </text>
      ` : ''}
    </svg>
  `;

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}
