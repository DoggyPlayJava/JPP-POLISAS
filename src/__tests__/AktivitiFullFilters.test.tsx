import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('AktivitiFull Single-Row Swipeable Filters & Inline Action Button', () => {
  const filePath = path.resolve(__dirname, '../pages/AktivitiFull.tsx');
  const content = fs.readFileSync(filePath, 'utf8');

  it('uses single-row horizontal scrollable container (overflow-x-auto no-scrollbar flex items-center gap-2) without flex-wrap', () => {
    // Should have overflow-x-auto no-scrollbar flex items-center gap-2
    expect(content).toMatch(/overflow-x-auto\s+no-scrollbar\s+flex\s+items-center\s+gap-2/);

    // Status filter chips container should NOT be flex-wrap
    expect(content).not.toMatch(/<div className="[^"]*flex[^"]*gap-3[^"]*flex-wrap/);
  });

  it('ensures status filter buttons have shrink-0 to prevent collapsing on mobile horizontal scroll', () => {
    // Extract filter chips section
    const filterSectionMatch = content.match(/setFilterStatus\(f\.key\)[\s\S]*?className=\{cn\([\s\S]*?\)\}/);
    expect(filterSectionMatch).toBeTruthy();
    const filterSection = filterSectionMatch![0];
    expect(filterSection).toContain('shrink-0');
  });

  it('includes all 5 required status filters: semua, perancangan, aktif, selesai, ditangguh', () => {
    expect(content).toContain("key: 'semua'");
    expect(content).toContain("key: 'perancangan'");
    expect(content).toContain("key: 'aktif'");
    expect(content).toContain("key: 'selesai'");
    expect(content).toContain("key: 'ditangguh'");
  });

  it('renders inline action button with w-full sm:w-auto directly above cards without floating FAB', () => {
    // Action button must have w-full sm:w-auto, h-11, px-6, rounded-2xl, bg-emerald-600
    const buttonMatch = content.match(/<Button[\s\S]*?openCreate[\s\S]*?Aktiviti Baru[\s\S]*?<\/Button>/);
    expect(buttonMatch).toBeTruthy();
    const buttonStr = buttonMatch![0];

    expect(buttonStr).toContain('w-full sm:w-auto');
    expect(buttonStr).toContain('h-11');
    expect(buttonStr).toContain('px-6');
    expect(buttonStr).toContain('rounded-2xl');
    expect(buttonStr).toContain('bg-emerald-600');

    // Must NOT have floating classes like fixed bottom- or fixed
    expect(buttonStr).not.toContain('fixed');
    expect(buttonStr).not.toContain('bottom-');
  });
});
