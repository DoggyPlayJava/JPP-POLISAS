import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('MeritRasmiReviewPanel Light & Dark Dual-Theme Contrast Parity', () => {
  const componentPath = path.resolve(__dirname, '../MeritRasmiReviewPanel.tsx');
  const sourceCode = fs.readFileSync(componentPath, 'utf8');

  it('verifies panel heading uses dual-theme text classes', () => {
    // Heading should be high-contrast slate in light mode and white in dark mode
    expect(sourceCode).toContain('text-slate-900 dark:text-white mt-0.5');
    expect(sourceCode).not.toContain('text-xl font-black text-white mt-0.5');
  });

  it('verifies info banner has high contrast in light mode', () => {
    // Info banner should not use raw text-white/50
    expect(sourceCode).not.toContain('text-[10px] text-white/50 leading-relaxed');
    expect(sourceCode).toMatch(/text-slate-700\s+dark:text-white\/70/);
  });

  it('verifies actionable application card has dual-theme container and title contrast', () => {
    // Card container
    expect(sourceCode).toContain('border border-slate-200 dark:border-white/[0.07] bg-slate-50/50 dark:bg-white/[0.02]');
    // Hover state
    expect(sourceCode).toContain('hover:bg-slate-100/60 dark:hover:bg-white/[0.02]');
    // Program title
    expect(sourceCode).toContain('text-sm font-black text-slate-900 dark:text-white leading-snug line-clamp-1');
    expect(sourceCode).not.toContain('text-sm font-black text-white leading-snug');
    // Type and attendee meta
    expect(sourceCode).toContain('text-[10px] font-bold text-slate-500 dark:text-white/40');
    // Applicant metadata
    expect(sourceCode).toContain('text-[9px] text-slate-500 dark:text-white/30 mt-0.5');
    // Chevrons
    expect(sourceCode).toContain('text-slate-400 dark:text-white/30');
  });

  it('verifies expanded justification, notes, and review details have dual-theme contrast', () => {
    // Expanded divider
    expect(sourceCode).toContain('border-t border-slate-200 dark:border-white/[0.05]');
    // Justification container
    expect(sourceCode).toContain('mt-3 p-3 rounded-2xl bg-slate-100/70 dark:bg-white/[0.03]');
    // Justification label & body
    expect(sourceCode).toContain('text-[9px] font-black uppercase text-slate-500 dark:text-white/30 mb-1');
    expect(sourceCode).toContain('text-[11px] text-slate-700 dark:text-white/60');
    // KPP notes
    expect(sourceCode).toContain('text-[10px] text-slate-700 dark:text-white/70');
  });

  it('verifies review textarea inputs support high contrast light mode', () => {
    // Textarea class checks
    expect(sourceCode).toContain('bg-white dark:bg-white/[0.04]');
    expect(sourceCode).toContain('border border-slate-200 dark:border-white/10');
    expect(sourceCode).toContain('text-slate-900 dark:text-white');
    expect(sourceCode).toContain('placeholder:text-slate-400 dark:placeholder:text-white/25');
  });

  it('verifies history card container, title, and metadata contrast in light mode', () => {
    // Container
    expect(sourceCode).toContain('border border-slate-200/70 dark:border-transparent bg-slate-50/60 dark:bg-white/[0.02]');
    // Title
    expect(sourceCode).toContain('text-[11px] font-black text-slate-800 dark:text-white/70 truncate');
    // Subtext
    expect(sourceCode).toContain('text-[9px] text-slate-500 dark:text-white/30');
  });

  it('verifies empty states and loading skeletons have light theme support', () => {
    // Empty state
    expect(sourceCode).toContain('text-slate-300 dark:text-white/10');
    expect(sourceCode).toContain('text-slate-400 dark:text-white/20');
    // Loading skeleton
    expect(sourceCode).toContain('rounded-[1.5rem] animate-pulse bg-slate-100 dark:bg-white/[0.04] border border-slate-200/50 dark:border-transparent');
  });
});
