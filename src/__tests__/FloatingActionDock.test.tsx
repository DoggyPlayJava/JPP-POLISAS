import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { FloatingActionDock } from '@/components/ui/FloatingActionDock';

describe('FloatingActionDock', () => {
  const dockPath = path.resolve(__dirname, '../components/ui/FloatingActionDock.tsx');

  it('declares FloatingActionDock component and exports', () => {
    expect(FloatingActionDock).toBeDefined();
    const sourceCode = fs.readFileSync(dockPath, 'utf8');
    expect(sourceCode).toContain('export function FloatingActionDock');
    expect(sourceCode).toContain('framer-motion');
    expect(sourceCode).toContain('tabular-nums');
  });

  it('anchors to dark background palette with rounded floating dock styling', () => {
    const sourceCode = fs.readFileSync(dockPath, 'utf8');
    expect(sourceCode).toContain('dark:bg-[#1C261D]/95');
    expect(sourceCode).toContain('fixed bottom-6');
  });
});
