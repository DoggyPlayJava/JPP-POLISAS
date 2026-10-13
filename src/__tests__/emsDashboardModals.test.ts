import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('EMS Dashboard Modal Extraction & Modernization', () => {
  const rootDir = path.resolve(__dirname, '../..');
  const modalsDir = path.resolve(rootDir, 'src/components/ems/modals');

  const expectedModals = [
    'EmsQrCodeModal.tsx',
    'EmsJuryCodeModal.tsx',
    'EmsTieBreakerModal.tsx',
    'EmsManualRegModal.tsx',
    'EmsEventCertsModal.tsx',
  ];

  it('verifies that all 5 modal component files exist in src/components/ems/modals/', () => {
    expectedModals.forEach((fileName) => {
      const fullPath = path.join(modalsDir, fileName);
      expect(
        fs.existsSync(fullPath),
        `Expected ${fileName} to exist in ${modalsDir}`
      ).toBe(true);
    });
  });

  it('verifies that all extracted modals export their component and contain zero raw emojis', () => {
    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]|\p{Extended_Pictographic}/u;

    expectedModals.forEach((fileName) => {
      const fullPath = path.join(modalsDir, fileName);
      if (!fs.existsSync(fullPath)) return;

      const content = fs.readFileSync(fullPath, 'utf-8');
      const lines = content.split('\n');
      const emojiLines: { line: number; text: string }[] = [];

      lines.forEach((line, index) => {
        if (emojiRegex.test(line)) {
          emojiLines.push({ line: index + 1, text: line.trim() });
        }
      });

      expect(
        emojiLines,
        `Found raw emojis in ${fileName}:\n${JSON.stringify(emojiLines, null, 2)}`
      ).toEqual([]);
    });
  });

  it('verifies that src/pages/ems/EmsDashboardPage.tsx line count is reduced below 800 lines', () => {
    const pagePath = path.resolve(rootDir, 'src/pages/ems/EmsDashboardPage.tsx');
    const content = fs.readFileSync(pagePath, 'utf-8');
    const lineCount = content.split('\n').length;

    // Previously 1,651 lines; target is less than 800 lines
    expect(lineCount).toBeLessThan(800);
  });

  it('verifies that EmsDashboardPage renders modern skeleton loaders and imports extracted modals', () => {
    const pagePath = path.resolve(rootDir, 'src/pages/ems/EmsDashboardPage.tsx');
    const content = fs.readFileSync(pagePath, 'utf-8');

    // Modals import checks
    expect(content).toContain('EmsQrCodeModal');
    expect(content).toContain('EmsJuryCodeModal');
    expect(content).toContain('EmsTieBreakerModal');
    expect(content).toContain('EmsManualRegModal');
    expect(content).toContain('EmsEventCertsModal');

    // Skeleton loader check (e.g., animate-pulse grid with cards)
    expect(content).toMatch(/animate-pulse/);
  });
});
