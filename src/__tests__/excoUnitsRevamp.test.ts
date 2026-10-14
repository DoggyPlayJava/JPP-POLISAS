import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const SRC = join(process.cwd(), 'src');
const UNITS_DIR = join(SRC, 'pages', 'jpp', 'units');

const ALL_9_UNITS = [
  { code: 'KPP', file: 'KppUnitDashboard.tsx', component: 'KppUnitDashboard' },
  { code: 'KEUSAHAWANAN', file: 'KeusahawananUnitDashboard.tsx', component: 'KeusahawananUnitDashboard' },
  { code: 'AKADEMIK', file: 'AkademikUnitDashboard.tsx', component: 'AkademikUnitDashboard' },
  { code: 'KK', file: 'KkUnitDashboard.tsx', component: 'KkUnitDashboard' },
  { code: 'KEBAJIKAN', file: 'KebajikanUnitDashboard.tsx', component: 'KebajikanUnitDashboard' },
  { code: 'SRK', file: 'SrkUnitDashboard.tsx', component: 'SrkUnitDashboard' },
  { code: 'KLS', file: 'KlsUnitDashboard.tsx', component: 'KlsUnitDashboard' },
  { code: 'MULTIMEDIA', file: 'MultimediaUnitDashboard.tsx', component: 'MultimediaUnitDashboard' },
  { code: 'KOLAB', file: 'KolaborasiUnitDashboard.tsx', component: 'KolaborasiUnitDashboard' },
];

describe('JPP EXCO Units Revamp — Kontrak Sistem & Integriti Dashboard', () => {
  it('semua 9 unit exco mempunyai fail dashboard khusus di src/pages/jpp/units/', () => {
    for (const unit of ALL_9_UNITS) {
      const filePath = join(UNITS_DIR, unit.file);
      expect(existsSync(filePath), `Fail ${unit.file} bagi unit ${unit.code} mesti wujud`).toBe(true);
    }
  });

  it('JppUnitDashboard.tsx mendaftarkan semua 9 unit dalam FULL_DASHBOARD_UNITS', () => {
    const routerContent = readFileSync(join(SRC, 'pages', 'jpp', 'JppUnitDashboard.tsx'), 'utf8');
    for (const unit of ALL_9_UNITS) {
      expect(routerContent, `Unit ${unit.code} mesti berdaftar dalam JppUnitDashboard.tsx`).toContain(`'${unit.code}'`);
      expect(routerContent, `Komponen ${unit.component} mesti diimport dan dimount`).toContain(unit.component);
    }
  });

  it('semua fail dashboard unit exco mematuhi GPU baseline (tiada ambient blur besar & tiada reflow animate)', () => {
    for (const unit of ALL_9_UNITS) {
      const content = readFileSync(join(UNITS_DIR, unit.file), 'utf8');
      expect(content, `${unit.file} ada ambient blur besar`).not.toMatch(/blur-2xl|blur-3xl|blur-\[[4-9][0-9]px\]/);
      expect(content, `${unit.file} ada backdrop-filter blur`).not.toMatch(/backdrop-filter:\s*blur/);
      expect(content, `${unit.file} ada reflow animation`).not.toMatch(/animate=\{\{[^}]*width:|animate=\{\{[^}]*height:|animate=\{\{[^}]*boxShadow:/);
    }
  });

  it('unit Multimedia, Kolaborasi, dan KLS menggunakan token tabular numbers font-mono tabular-nums font-black', () => {
    const targetUnits = ['MultimediaUnitDashboard.tsx', 'KolaborasiUnitDashboard.tsx', 'KlsUnitDashboard.tsx', 'KppUnitDashboard.tsx'];
    for (const file of targetUnits) {
      const content = readFileSync(join(UNITS_DIR, file), 'utf8');
      expect(content, `${file} mesti mengandungi class font-mono`).toContain('font-mono');
      expect(content, `${file} mesti mengandungi class tabular-nums`).toContain('tabular-nums');
      expect(content, `${file} mesti mengandungi class font-black`).toContain('font-black');
    }
  });

  it('unit Multimedia, Kolaborasi, dan KLS menggunakan token kad standard dan shadow-xs', () => {
    const targetUnits = ['MultimediaUnitDashboard.tsx', 'KolaborasiUnitDashboard.tsx', 'KlsUnitDashboard.tsx'];
    for (const file of targetUnits) {
      const content = readFileSync(join(UNITS_DIR, file), 'utf8');
      expect(content, `${file} mesti menggunakan shadow-xs`).toContain('shadow-xs');
      expect(content, `${file} mesti menggunakan rounded-2xl`).toContain('rounded-2xl');
      expect(content, `${file} mesti menggunakan border-slate-200 dark:border-white/[0.06]`).toContain('border-slate-200 dark:border-white/[0.06]');
    }
  });

  it('unit Multimedia, Kolaborasi, dan KLS menggunakan Promise.all untuk query data (mengelakkan N+1 loop)', () => {
    const targetUnits = ['MultimediaUnitDashboard.tsx', 'KolaborasiUnitDashboard.tsx', 'KlsUnitDashboard.tsx'];
    for (const file of targetUnits) {
      const content = readFileSync(join(UNITS_DIR, file), 'utf8');
      expect(content, `${file} mesti menggunakan Promise.all untuk data fetch berbilang sumber`).toContain('Promise.all');
    }
  });
});
