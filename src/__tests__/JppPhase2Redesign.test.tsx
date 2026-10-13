import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('JPP Phase 2 Redesign Verifications', () => {
  it('verifies JppSettingsPage has skeleton loading and purged AI gradients', () => {
    const filePath = path.resolve(__dirname, '../pages/jpp/JppSettingsPage.tsx');
    const source = fs.readFileSync(filePath, 'utf8');

    // Skeletons replace loader2 spinner
    expect(source).toContain('animate-pulse');
    expect(source).not.toContain('Memuatkan Tetapan Sistem...');
    
    // Purged AI gradients & dead div
    expect(source).not.toContain('dark:from-violet-900/10');
    expect(source).not.toContain('dark:from-rose-900/10');
    expect(source).not.toContain('<div className="fixed inset-0 pointer-events-none z-0">');
    expect(source).toContain('dark:bg-[#1C261D]');
  });

  it('verifies AnnouncementsPage uses SlideOverSheet and card skeletons', () => {
    const filePath = path.resolve(__dirname, '../pages/jpp/AnnouncementsPage.tsx');
    const source = fs.readFileSync(filePath, 'utf8');

    // SlideOverSheet integration
    expect(source).toContain("import { SlideOverSheet } from '@/components/jpp/SlideOverSheet';");
    expect(source).toContain('<SlideOverSheet');
    expect(source).not.toContain('className="fixed inset-0 z-50 flex items-center justify-center p-4"');

    // Header & skeletons
    expect(source).toContain('JPP HQ • Hebahan Rasmi');
    expect(source).toContain('animate-pulse');
    expect(source).not.toContain('Activity className="animate-spin"');

    // Sanitized toasts
    expect(source).not.toContain("toast.success('Hebahan dikemas kini!');");
    expect(source).not.toContain("toast.success('Hebahan berjaya dicipta!');");
  });

  it('verifies JppUsersPage uses table skeletons and warm institutional dark surfaces', () => {
    const filePath = path.resolve(__dirname, '../pages/jpp/JppUsersPage.tsx');
    const source = fs.readFileSync(filePath, 'utf8');

    // Replaced plain loading text with 5 skeleton rows
    expect(source).toContain('[1, 2, 3, 4, 5].map((i) => (');
    expect(source).not.toContain('Memuatkan data...');

    // Purged #0f0f13 cool navy from dropdowns
    expect(source).not.toContain('dark:bg-[#0f0f13]');
    expect(source).toContain('dark:bg-[#1C261D]');

    // Monospace tabular nums for token counts
    expect(source).toContain('font-mono text-sm text-slate-900 dark:text-white/80 tabular-nums');
  });

  it('verifies JppOverviewPage uses font-mono tabular-nums and escape listener', () => {
    const filePath = path.resolve(__dirname, '../pages/jpp/JppOverviewPage.tsx');
    const source = fs.readFileSync(filePath, 'utf8');

    expect(source).toContain('leading-none font-mono tabular-nums">{value}</p>');
    expect(source).toContain("e.key === 'Escape'");
  });

  it('verifies JppFoodBankAdmin uses tabular-nums for official budget allocations', () => {
    const filePath = path.resolve(__dirname, '../pages/jpp/JppFoodBankAdmin.tsx');
    const source = fs.readFileSync(filePath, 'utf8');

    expect(source).toContain('mt-1 font-mono tabular-nums');
    expect(source).toContain('font-mono tabular-nums');
  });

  it('verifies JppNexusPage and JppTelemetryPage upgrades', () => {
    const nexusPath = path.resolve(__dirname, '../pages/jpp/JppNexusPage.tsx');
    const nexusSource = fs.readFileSync(nexusPath, 'utf8');
    expect(nexusSource).toContain('text-white font-mono tabular-nums');
    expect(nexusSource).not.toContain('from-indigo-500 to-indigo-300');

    const telemetryPath = path.resolve(__dirname, '../pages/jpp/JppTelemetryPage.tsx');
    const telemetrySource = fs.readFileSync(telemetryPath, 'utf8');
    expect(telemetrySource).toContain('Loading Skeleton Screen');
    expect(telemetrySource).toContain('animate-pulse');
  });
});
