import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Universal LanguageToggle Mount Parity with ThemeToggle', () => {
  const targetFiles = [
    'src/components/portal/SuperAppHeader.tsx',
    'src/components/portal/PortalNavbar.tsx',
    'src/pages/jpp/JppSidebar.tsx',
    'src/pages/kebajikan/KebajikanLayout.tsx',
    'src/pages/kebajikan/KebajikanSidebar.tsx',
    'src/pages/keusahawanan/KeusahawananLayout.tsx',
    'src/pages/akademik/AkademikLayout.tsx',
    'src/components/makmp/MakmpJppChrome.tsx',
    'src/pages/polyservices/PolySuaraPage.tsx',
    'src/pages/ems/EmsCertificatePage.tsx',
    'src/pages/ems/EmsCertVerifyPage.tsx',
    'src/pages/ems/EmsCheckinPage.tsx',
    'src/pages/ems/EmsJuryPortalPage.tsx',
    'src/pages/ems/EmsLeaderboardPage.tsx',
    'src/pages/ems/EmsPublicRegisterPage.tsx',
    'src/pages/ems/EmsAudienceScanPage.tsx',
  ];

  targetFiles.forEach((file) => {
    it(`verifies LanguageToggle is imported and mounted alongside ThemeToggle in ${file}`, () => {
      const fullPath = path.resolve(process.cwd(), file);
      const content = fs.readFileSync(fullPath, 'utf8');
      expect(content).toContain('LanguageToggle');
      expect(content).toContain('<LanguageToggle');
      expect(content).toContain('ThemeToggle');
    });
  });
});
