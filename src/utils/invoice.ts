import fs from 'fs';

export interface InvoiceCheck {
  bytes: number;
  detectedType: 'pdf' | 'text' | 'other';
  plausible: boolean;
  notes: string[];
}

/**
 * Plausibility check for a downloaded invoice. It does not parse PDFs: it checks size,
 * magic bytes, and whether text content is readable.
 */
export function inspectInvoice(filePath: string): InvoiceCheck {
  const buf = fs.readFileSync(filePath);
  if (buf.length === 0) return { bytes: 0, detectedType: 'other', plausible: false, notes: ['file is empty'] };
  if (buf.subarray(0, 4).toString('latin1') === '%PDF') {
    return { bytes: buf.length, detectedType: 'pdf', plausible: buf.length > 500, notes: ['PDF magic bytes present'] };
  }
  const chars = [...buf.toString('utf8')];
  const printable = chars.filter((c) => /[\x20-\x7E\r\n\t]/.test(c)).length / Math.max(chars.length, 1);
  if (printable > 0.9 && chars.length > 20) {
    return { bytes: buf.length, detectedType: 'text', plausible: true, notes: ['readable text content'] };
  }
  return { bytes: buf.length, detectedType: 'other', plausible: false, notes: ['neither PDF nor readable text'] };
}
