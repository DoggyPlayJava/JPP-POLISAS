import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { LIKERT_OPTIONS } from '@/pages/ems/EmsJuryPortalPage';

describe('EMS Jury Modal Redesign Contracts', () => {
  const filePath = path.resolve(__dirname, '../pages/ems/EmsJuryPortalPage.tsx');
  const sourceCode = fs.readFileSync(filePath, 'utf-8');

  it('verifies LIKERT_OPTIONS has 5 valid Likert items from 1 to 5', () => {
    expect(LIKERT_OPTIONS).toHaveLength(5);
    const values = LIKERT_OPTIONS.map((o) => o.value).sort((a, b) => a - b);
    expect(values).toEqual([1, 2, 3, 4, 5]);
  });

  it('verifies sticky section header uses solid background without translucent /95 opacity', () => {
    // Translucent bg-slate-100/95 was causing text collision on scroll
    expect(sourceCode).not.toContain('bg-slate-100/95');
    expect(sourceCode).not.toContain('bg-slate-900/95');
  });

  it('verifies Candidate Info drawer state is present', () => {
    expect(sourceCode).toContain('showCandidateInfo');
    expect(sourceCode).toContain('setShowCandidateInfo');
  });

  it('verifies redundant Pemberat label is replaced with standardized Wajaran', () => {
    // Pemberat was creating duplicate weight pills in the criterion card
    expect(sourceCode).not.toContain('Pemberat:');
  });
});
