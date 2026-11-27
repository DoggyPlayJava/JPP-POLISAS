import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
// @ts-ignore - ESM script helper without .d.ts
import { runDesignTokenAudit } from '../../scripts/check-design-tokens.mjs';

const ROOT = path.resolve(__dirname, '../..');

function read(relPath: string) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

describe('Semambu Mineral Teal & Crisp Alabaster Design System', () => {
  it('enforces zero forbidden legacy Earthy/Maroon tokens across non-allowlisted web UI', () => {
    const violations = runDesignTokenAudit(ROOT);
    expect(violations).toEqual([]);
  });

  it('defines Mineral Teal and Crisp Alabaster canonical tokens in DESIGN.md and src/index.css', () => {
    const designMd = read('DESIGN.md');
    const indexCss = read('src/index.css');

    expect(designMd).toContain('#0F766E');
    expect(designMd).toContain('#F6FBF9');
    expect(designMd).toContain('#061714');
    expect(designMd).toContain('#0B2420');

    expect(indexCss).toContain('backdrop-filter: none !important');
    expect(indexCss).toContain('--primary: 175 77% 26%');
    expect(indexCss).toContain('#0B2420');
  });

  it('keeps KlkLayout, KlkSidebar, PolyRiderLayout, and PolyTaskLayout unified on Pine-Teal and 100dvh', () => {
    const klkLayout = read('src/pages/klk/KlkLayout.tsx');
    const klkSidebar = read('src/pages/klk/KlkSidebar.tsx');
    const polyRiderLayout = read('src/pages/polyrider/PolyRiderLayout.tsx');
    const polyTaskLayout = read('src/pages/polytask/PolyTaskLayout.tsx');

    expect(klkLayout).toContain('100dvh');
    expect(klkLayout).toContain('<LanguageToggle');
    expect(klkLayout).not.toContain('backdrop-blur');

    expect(klkSidebar).toContain('#0B2420');
    expect(klkSidebar).toContain('#061714');
    expect(klkSidebar).toContain('100dvh');

    expect(polyRiderLayout).toContain('100dvh');
    expect(polyRiderLayout).toContain('#F6FBF9');

    expect(polyTaskLayout).toContain('100dvh');
    expect(polyTaskLayout).toContain('#0B2420');
    expect(polyTaskLayout).not.toContain('backdrop-blur');
  });

  it('exposes check:design-tokens script in package.json', () => {
    const pkg = JSON.parse(read('package.json'));
    expect(pkg.scripts['check:design-tokens']).toBe('node scripts/check-design-tokens.mjs');
    expect(pkg.scripts.lint).toContain('check:design-tokens');
  });
});
