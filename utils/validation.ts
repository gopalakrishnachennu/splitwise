/**
 * Input validation helpers so number fields only accept valid numeric input.
 */

/**
 * Sanitize string so it contains only a valid decimal number:
 * - Optional leading minus (if allowNegative)
 * - Digits 0-9
 * - At most one decimal point
 * Use in onChangeText for amount / decimal inputs.
 */
export function sanitizeDecimalInput(text: string, allowNegative = false): string {
  let out = '';
  let hasDot = false;
  const allowMinus = allowNegative;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c >= '0' && c <= '9') {
      out += c;
    } else if (c === '.' && !hasDot) {
      hasDot = true;
      out += c;
    } else if (allowMinus && c === '-' && out.length === 0) {
      out += c;
    }
  }
  return out;
}

/**
 * Sanitize string so it contains only a valid non-negative integer (e.g. for shares).
 * Digits only, no decimal, no minus.
 */
export function sanitizeIntegerInput(text: string): string {
  let out = '';
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c >= '0' && c <= '9') out += c;
  }
  return out;
}

/**
 * Return true if the string is a valid positive number (for amount validation).
 */
export function isValidPositiveNumber(value: string): boolean {
  if (!value || !value.trim()) return false;
  const n = parseFloat(value);
  return !Number.isNaN(n) && n > 0;
}

/**
 * Return true if the string is a valid number >= 0 (for percentages, shares).
 */
export function isValidNonNegativeNumber(value: string): boolean {
  if (!value || !value.trim()) return true; // empty treated as 0
  const n = parseFloat(value);
  return !Number.isNaN(n) && n >= 0;
}
