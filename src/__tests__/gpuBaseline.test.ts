import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';

const SRC = join(process.cwd(), 'src');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

describe('GPU baseline — satu code path, semua device ringan', () => {
  const css = readFileSync(join(SRC, 'index.css'), 'utf8');
  const tsxFiles = walk(SRC).filter(
    (f) => f.endsWith('.tsx') && !f.includes('LaunchVideo') && !f.includes('PromoPage')
  );

  it('index.css tiada backdrop-filter nilai blur (kekal hanya kill-switch none)', () => {
    // Global rule `* { backdrop-filter: none }` dibenarkan — itu kill-switch.
    expect(css).not.toMatch(/backdrop-filter:\s*blur|backdrop-filter:\s*saturate|backdrop-filter:\s*\(/);
  });

  it('index.css tiada .low-perf-device block', () => {
    expect(css).not.toContain('low-perf-device');
  });

  it('hook useDevicePerformance sudah dipadam', () => {
    expect(existsSync(join(SRC, 'hooks', 'useDevicePerformance.ts'))).toBe(false);
  });

  it('tiada isLowPerf / isLowEnd / useDevicePerformance dalam source', () => {
    for (const f of tsxFiles) {
      const c = readFileSync(f, 'utf8');
      expect(c, `${f} ada rujukan perf branch`).not.toMatch(/isLowPerf|isLowEnd|useDevicePerformance/);
    }
  });

  it('tiada ambient blur besar (blur-2xl/3xl/blur-[>=40px])', () => {
    for (const f of tsxFiles) {
      const c = readFileSync(f, 'utf8');
      expect(c, `${f} ada ambient blur`).not.toMatch(/blur-2xl|blur-3xl|blur-\[[4-9][0-9]px\]|blur-\[[1-6][0-9][0-9]px\]/);
    }
  });

  it('tiada animation reflow (width/height/boxShadow dalam motion animate)', () => {
    for (const f of tsxFiles) {
      const c = readFileSync(f, 'utf8');
      expect(c, `${f} ada reflow animation`).not.toMatch(/animate=\{\{[^}]*width:|animate=\{\{[^}]*height:|animate=\{\{[^}]*boxShadow:/);
    }
  });

  it('BottomNav tiada ambient colored glow (shadow-[color]/30) dan tiada 150px inset vignette', () => {
    const bottomNav = readFileSync(join(SRC, 'components', 'layout', 'BottomNav.tsx'), 'utf8');
    expect(bottomNav).not.toMatch(/shadow-[a-z]+-[0-9]+\/30/);
    expect(bottomNav).not.toMatch(/inset_0_0_150px/);
  });

  it('BottomNav dock dan menu menggunakan background legap (bukan /60 atau /90)', () => {
    const bottomNav = readFileSync(join(SRC, 'components', 'layout', 'BottomNav.tsx'), 'utf8');
    expect(bottomNav).not.toContain('bg-white/60');
    expect(bottomNav).not.toContain('bg-white/90');
  });

  it('PortalSidebar menggunakan background legap (bukan /80)', () => {
    const sidebar = readFileSync(join(SRC, 'components', 'layout', 'PortalSidebar.tsx'), 'utf8');
    expect(sidebar).not.toContain('bg-white/80');
  });
});
