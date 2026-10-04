import { describe, it, expect } from 'vitest';
import { validatePromptInput } from '@/lib/promptUtils';

export interface PromptDialogState {
  open: boolean;
  title: string;
  description?: string;
  inputType?: 'text' | 'textarea' | 'number';
  initialValue?: string;
  inputLabel?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'destructive';
}

describe('PromptDialog Logic & Validation Suite', () => {
  it('sepatutnya membenarkan pengesahan mudah tanpa input (confirmation mode)', () => {
    const state: PromptDialogState = {
      open: true,
      title: 'Sahkan Tindakan',
      description: 'Adakah anda pasti untuk meneruskan?',
      confirmLabel: 'Ya, Teruskan',
      cancelLabel: 'Batal',
    };

    expect(state.open).toBe(true);
    expect(state.inputType).toBeUndefined();
    expect(state.confirmLabel).toBe('Ya, Teruskan');
  });

  it('sepatutnya mengesan ralat jika medan mandatori dibiarkan kosong', () => {
    const result = validatePromptInput('', { required: true });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Sila masukkan maklumat');
  });

  it('sepatutnya menerima input teks yang sah untuk alasan penolakan atau permohonan unlock', () => {
    const reason = 'Terdapat ralat pada tarikh pelaksanaan program';
    const result = validatePromptInput(reason, { required: true });
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('sepatutnya mengesahkan had nombor penalti merit dengan betul (0 hingga 100)', () => {
    const validPenalty = validatePromptInput('5', { isNumber: true, min: 0, max: 100 });
    expect(validPenalty.valid).toBe(true);
    expect(validPenalty.parsedNumber).toBe(5);

    const negativePenalty = validatePromptInput('-5', { isNumber: true, min: 0, max: 100 });
    expect(negativePenalty.valid).toBe(false);
    expect(negativePenalty.error).toContain('Nilai minimum ialah 0');

    const excessivePenalty = validatePromptInput('150', { isNumber: true, min: 0, max: 100 });
    expect(excessivePenalty.valid).toBe(false);
    expect(excessivePenalty.error).toContain('Nilai maksimum ialah 100');

    const invalidNumber = validatePromptInput('abc', { isNumber: true });
    expect(invalidNumber.valid).toBe(false);
    expect(invalidNumber.error).toContain('Sila masukkan nombor yang sah');
  });
});
