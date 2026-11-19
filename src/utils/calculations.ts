/**
 * Parse the first number in a price such as "Rs. 1,500", "Rs. 500" or "$29.99".
 * Currency symbols and the "." in "Rs." must not be kept, or "Rs. 2000" becomes 0.2.
 */
export function parsePrice(raw: string): number {
  const match = raw.replace(/,/g, '').match(/\d+(\.\d+)?/);
  if (!match) throw new Error(`Cannot parse price from "${raw}"`);
  return Number(match[0]);
}

/** Round a line total to cents. */
export function expectedLineTotal(unitPrice: number, quantity: number): number {
  return Math.round(unitPrice * quantity * 100) / 100;
}

/** Sum of line totals, rounded to cents. */
export function expectedCartTotal(lines: Array<{ unitPrice: number; quantity: number }>): number {
  return Math.round(lines.reduce((acc, l) => acc + l.unitPrice * l.quantity, 0) * 100) / 100;
}

/** Collapse whitespace so UI text can be compared with API and fixture text. */
export function norm(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}
