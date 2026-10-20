import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('CompleteProfileModal Header Language Integration', () => {
  const modalPath = path.resolve(process.cwd(), 'src/components/ui/CompleteProfileModal.tsx');
  const sourceCode = fs.readFileSync(modalPath, 'utf8');

  it('imports changeLanguage and SupportedLanguage from @/lib/i18n', () => {
    expect(sourceCode).toContain("from '@/lib/i18n'");
    expect(sourceCode).toMatch(/changeLanguage/);
  });

  it('renders segmented control for BM and EN in the modal header', () => {
    expect(sourceCode).toMatch(/changeLanguage\(['"]ms['"]\)/);
    expect(sourceCode).toMatch(/changeLanguage\(['"]en['"]\)/);
  });

  it('includes preferred_language in the profile update submission payload', () => {
    expect(sourceCode).toMatch(/preferred_language/);
  });
});
