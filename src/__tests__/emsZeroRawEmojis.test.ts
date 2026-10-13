import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('EMS 100% Zero Raw Emojis Cleanse', () => {
  const rootDir = path.resolve(__dirname, '../..');
  const targetFiles = [
    'src/pages/ems/EmsAudienceScanPage.tsx',
    'src/pages/ems/EmsCheckinPage.tsx',
    'src/pages/ems/EmsDashboardPage.tsx',
    'src/pages/ems/EmsEventFormPage.tsx',
    'src/pages/ems/EmsLeaderboardPage.tsx',
    'src/pages/ems/EmsPublicRegisterPage.tsx',
    'src/components/ems/EmsLuckyDrawModal.tsx',
  ];

  const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]|\p{Extended_Pictographic}/u;

  targetFiles.forEach((relPath) => {
    it(`verifies 0 raw emojis in ${relPath}`, () => {
      const fullPath = path.resolve(rootDir, relPath);
      const content = fs.readFileSync(fullPath, 'utf-8');
      const lines = content.split('\n');
      const emojiLines: { line: number; text: string }[] = [];

      lines.forEach((line, index) => {
        if (emojiRegex.test(line)) {
          emojiLines.push({ line: index + 1, text: line.trim() });
        }
      });

      expect(emojiLines, `Found raw emojis in ${relPath}:\n${JSON.stringify(emojiLines, null, 2)}`).toEqual([]);
    });
  });
});
