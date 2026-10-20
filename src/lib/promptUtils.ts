/**
 * promptUtils.ts
 * Shared validation and helper utilities for accessible modal prompt dialogs.
 */

import i18n from '@/lib/i18n';

const t = (k: string, fb: string, opt?: any): string =>
  (i18n.isInitialized ? (i18n.t(k, { defaultValue: fb, ...opt }) as string) : fb);

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
    return { valid: false, error: t('services:please_enter_required_info', 'Sila masukkan maklumat yang diperlukan.') };
  }

  if (options.isNumber) {
    const num = Number(trimmed);
    if (isNaN(num)) {
      return { valid: false, error: t('services:please_enter_valid_number', 'Sila masukkan nombor yang sah.') };
    }
    if (options.min !== undefined && num < options.min) {
      return { valid: false, error: t('services:min_value_is', 'Nilai minimum ialah {{min}}.', { min: options.min }) };
    }
    if (options.max !== undefined && num > options.max) {
      return { valid: false, error: t('services:max_value_is', 'Nilai maksimum ialah {{max}}.', { max: options.max }) };
    }
    return { valid: true, parsedNumber: num };
  }

  return { valid: true };
}
