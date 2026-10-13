import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { getCampusServicesConfig } from '../lib/superAppHelpers';

describe('Portal Takwim Button & Tab Sync', () => {
  const helpersPath = path.resolve(__dirname, '../lib/superAppHelpers.ts');
  const takwimPagePath = path.resolve(__dirname, '../pages/akademik/AkademikTakwimPage.tsx');

  describe('Portal Takwim Route Configuration', () => {
    it('verifies getCampusServicesConfig routes takwim item to /akademik/takwim?tab=pusat', () => {
      const services = getCampusServicesConfig({});
      const takwimService = services.find(s => s.id === 'takwim');
      expect(takwimService).toBeDefined();
      expect(takwimService?.routeOrAction).toBe('/akademik/takwim?tab=pusat');
    });

    it('verifies source code in superAppHelpers.ts defines routeOrAction as /akademik/takwim?tab=pusat', () => {
      const content = fs.readFileSync(helpersPath, 'utf8');
      expect(content).toContain("routeOrAction: '/akademik/takwim?tab=pusat'");
    });
  });

  describe('AkademikTakwimPage Query Parameter Synchronization', () => {
    it('verifies AkademikTakwimPage imports useSearchParams from react-router-dom', () => {
      const content = fs.readFileSync(takwimPagePath, 'utf8');
      expect(content).toMatch(/import\s*\{[^}]*useSearchParams[^}]*\}\s*from\s*['"]react-router-dom['"]/);
    });

    it('verifies AkademikTakwimPage reads tab query parameter with searchParams.get("tab")', () => {
      const content = fs.readFileSync(takwimPagePath, 'utf8');
      expect(content).toMatch(/searchParams\.get\(['"]tab['"]\)/);
    });

    it('verifies AkademikTakwimPage defaults or maps tab to PUSAT and PERSONAL', () => {
      const content = fs.readFileSync(takwimPagePath, 'utf8');
      expect(content).toMatch(/pusat/i);
      expect(content).toMatch(/PUSAT/);
      expect(content).toMatch(/PERSONAL/);
    });

    it('verifies AkademikTakwimPage keeps tab synchronized in useEffect when searchParams change', () => {
      const content = fs.readFileSync(takwimPagePath, 'utf8');
      expect(content).toContain('useEffect');
      expect(content).toMatch(/useEffect\(\s*\(\)\s*=>\s*\{[\s\S]*?searchParams[\s\S]*?\},\s*\[[^\]]*searchParams[^\]]*\]\)/);
    });
  });
});
