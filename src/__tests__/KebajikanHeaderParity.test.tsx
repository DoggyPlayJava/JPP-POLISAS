import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Kebajikan Mobile Header Parity', () => {
  const submitPagePath = path.resolve(__dirname, '../pages/kebajikan/KebajikanSubmitPage.tsx');
  const layoutPath = path.resolve(__dirname, '../pages/kebajikan/KebajikanLayout.tsx');

  it('verifies KebajikanSubmitPage hides its local top nav on mobile (hidden lg:flex)', () => {
    const content = fs.readFileSync(submitPagePath, 'utf8');
    expect(content).toMatch(/hidden\s+lg:flex/);
  });

  it('verifies KebajikanLayout handles submit page back navigation cleanly', () => {
    const content = fs.readFileSync(layoutPath, 'utf8');
    expect(content).toContain('isSubmitOrChatPage');
    expect(content).toContain('ChevronLeft');
    expect(content).toContain('to="/portal"');
  });
});
