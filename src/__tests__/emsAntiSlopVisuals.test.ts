import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('EMS Anti-Slop Visual Upgrade for Public Registration & Verification', () => {
  const rootDir = path.resolve(__dirname, '../..');

  it('verifies EmsCertVerifyPage does NOT contain generic AI purple gradient', () => {
    const filePath = path.resolve(rootDir, 'src/pages/ems/EmsCertVerifyPage.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');

    expect(content).not.toContain('from-purple-600 to-indigo-600');
  });

  it('verifies EmsCertVerifyPage uses tabular-nums for serial numbers', () => {
    const filePath = path.resolve(rootDir, 'src/pages/ems/EmsCertVerifyPage.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');

    expect(content).toContain('tabular-nums');
  });

  it('verifies EmsPublicRegisterPage contains mobile sticky bottom navigation capsule', () => {
    const filePath = path.resolve(rootDir, 'src/pages/ems/EmsPublicRegisterPage.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');

    const hasStickyBottom = content.includes('fixed bottom') || content.includes('sticky bottom');
    expect(hasStickyBottom).toBe(true);
  });

  it('verifies EmsPublicRegisterPage does NOT contain AI purple gradient or purple selection', () => {
    const filePath = path.resolve(rootDir, 'src/pages/ems/EmsPublicRegisterPage.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');

    expect(content).not.toContain('from-purple-600 to-indigo-600');
    expect(content).not.toContain('selection:bg-purple-500');
  });

  it('verifies EmsPublicRegisterPage uses text-wrap:balance for event title', () => {
    const filePath = path.resolve(rootDir, 'src/pages/ems/EmsPublicRegisterPage.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');

    expect(content).toContain('[text-wrap:balance]');
  });

  it('verifies EmsCertificatePage uses tabular-nums for serial IDs and dates', () => {
    const filePath = path.resolve(rootDir, 'src/pages/ems/EmsCertificatePage.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');

    expect(content).toContain('tabular-nums');
    expect(content).not.toContain('from-purple-600 to-indigo-600');
  });

  it('verifies EmsAudienceScanPage uses active:scale-[0.98] on buttons', () => {
    const filePath = path.resolve(rootDir, 'src/pages/ems/EmsAudienceScanPage.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');

    expect(content).toContain('active:scale-[0.98]');
    expect(content).not.toContain('from-purple-600 to-indigo-600');
  });
});
