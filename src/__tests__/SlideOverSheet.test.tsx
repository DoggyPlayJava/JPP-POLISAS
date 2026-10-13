import React from 'react';
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { SlideOverSheet } from '@/components/ui/SlideOverSheet';

describe('SlideOverSheet', () => {
  const sheetPath = path.resolve(__dirname, '../components/ui/SlideOverSheet.tsx');

  it('declares SlideOverSheet component interface and exports', () => {
    expect(SlideOverSheet).toBeDefined();
    const sourceCode = fs.readFileSync(sheetPath, 'utf8');
    expect(sourceCode).toContain('export function SlideOverSheet');
    expect(sourceCode).toContain('@radix-ui/react-dialog');
    expect(sourceCode).toContain('framer-motion');
  });

  it('contains dark background styling adhering to warm institutional palette', () => {
    const sourceCode = fs.readFileSync(sheetPath, 'utf8');
    expect(sourceCode).toContain('dark:bg-[#1C261D]');
  });
});
