/**
 * promptUtils.ts
 * Shared validation and helper utilities for accessible modal prompt dialogs.
 */

export interface PromptValidationOptions {
  required?: boolean;
  min?: number;
  max?: number;
  isNumber?: boolean;
}

export interface PromptValidationResult {
  valid: boolean;
  error?: string;
  parsedNumber?: number;
}

export function validatePromptInput(
  value: string,
  options: PromptValidationOptions = {}
): PromptValidationResult {
  const trimmed = value.trim();
  if (options.required && !trimmed) {
    return { valid: false, error: 'Sila masukkan maklumat yang diperlukan.' };
  }

  if (options.isNumber) {
    const num = Number(trimmed);
    if (isNaN(num)) {
      return { valid: false, error: 'Sila masukkan nombor yang sah.' };
    }
    if (options.min !== undefined && num < options.min) {
      return { valid: false, error: `Nilai minimum ialah ${options.min}.` };
    }
    if (options.max !== undefined && num > options.max) {
      return { valid: false, error: `Nilai maksimum ialah ${options.max}.` };
    }
    return { valid: true, parsedNumber: num };
  }

  return { valid: true };
}
