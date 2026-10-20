import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('JppSidebar Ergonomics & Canvas Texture', () => {
  const sidebarPath = path.resolve(__dirname, '../pages/jpp/JppSidebar.tsx');
  const cssPath = path.resolve(__dirname, '../index.css');
  const layoutPath = path.resolve(__dirname, '../pages/jpp/JppLayout.tsx');

  const sidebarCode = fs.readFileSync(sidebarPath, 'utf8');
  const cssCode = fs.readFileSync(cssPath, 'utf8');
  const layoutCode = fs.readFileSync(layoutPath, 'utf8');

  it('uses institutional GraduationCap icon for student database instead of Briefcase', () => {
    expect(sidebarCode).toContain('GraduationCap');
    expect(sidebarCode).toMatch(/icon:\s*GraduationCap,\s*label:\s*(t\([^)]*'Pelajar'[^)]*\)|'Pelajar')/);
  });

  it('adds active:scale-[0.98] tactile feedback to navigation links', () => {
    expect(sidebarCode).toContain('active:scale-[0.98]');
  });

  it('defines .jpp-canvas-texture in index.css and applies to JppLayout', () => {
    expect(cssCode).toContain('.jpp-canvas-texture');
    expect(layoutCode).toContain('jpp-canvas-texture');
  });
});
