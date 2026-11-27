import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');

function read(relPath: string) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

describe('Semambu Mineral Teal & Crisp Alabaster Design System', () => {
  it('keeps legacy palette tokens out of application UI files', () => {
    const forbidden = /#(?:2E3A2F|556453|6B7F5B|C96F4F|F8F6EE|D9C9B2|151D16|1E271F|242E25|3A4A3B)\b/gi;
    const violations: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const file = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (!['__tests__', 'locales'].includes(entry.name)) walk(file);
        } else if (/\.(tsx?|css)$/.test(entry.name)) {
          const source = fs.readFileSync(file, 'utf8');
          if (forbidden.test(source)) violations.push(path.relative(ROOT, file));
          forbidden.lastIndex = 0;
        }
      }
    };
    walk(path.join(ROOT, 'src'));
    expect(violations).toEqual([]);
  });

  it('defines Mineral Teal light and Obsidian Carbon dark tokens in src/index.css', () => {
    const indexCss = read('src/index.css');
    expect(indexCss).toContain('backdrop-filter: none !important');
    expect(indexCss).toContain('--primary: 175 77% 26%');
    expect(indexCss).toContain('--background: 216 22% 4.5%');
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
