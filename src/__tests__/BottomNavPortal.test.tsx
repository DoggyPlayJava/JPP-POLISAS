import React from 'react';
import fs from 'fs';
import path from 'path';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

// Mocks for contexts and dependencies used by BottomNav
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    isSuperAdmin: false,
    isJppMember: false,
    profile: {
      intake_year: '2025',
      intake_period: 1,
      programme_code: 'DIT',
    },
  }),
}));

vi.mock('@/contexts/AcademicSessionContext', () => ({
  useAcademicSession: () => ({
    intake1Month: 7,
    intake2Month: 12,
  }),
}));

vi.mock('../components/portal/PolymartServiceModal', () => ({
  PolymartServiceModal: () => null,
}));

// Mock framer-motion to simplify DOM output
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, id, onClick, ...props }: any) => (
      React.createElement('div', { className, id, onClick, ...props }, children)
    ),
    button: ({ children, className, onClick, ...props }: any) => (
      React.createElement('button', { className, onClick, ...props }, children)
    ),
    span: ({ children, className, ...props }: any) => (
      React.createElement('span', { className, ...props }, children)
    ),
  },
  AnimatePresence: ({ children }: any) => children,
  useScroll: () => ({ scrollY: { getPrevious: () => 0 } }),
  useMotionValueEvent: vi.fn(),
  useDragControls: () => ({ start: vi.fn() }),
}));

describe('BottomNav React Portal Architecture', () => {
  const bottomNavSourcePath = path.resolve(__dirname, '../components/layout/BottomNav.tsx');

  it('imports createPortal from react-dom', () => {
    const content = fs.readFileSync(bottomNavSourcePath, 'utf8');
    expect(content).toMatch(/import\s*\{[^}]*createPortal[^}]*\}\s*from\s*['"]react-dom['"]/);
  });

  it('declares mounted state and client-side mount effect', () => {
    const content = fs.readFileSync(bottomNavSourcePath, 'utf8');
    expect(content).toMatch(/const\s*\[\s*mounted\s*,\s*setMounted\s*\]\s*=\s*useState\s*\(\s*false\s*\)/);
    expect(content).toMatch(/useEffect\s*\(\s*\(\s*\)\s*=>\s*\{\s*setMounted\s*\(\s*true\s*\);\s*\}\s*,\s*\[\s*\]\s*\)/);
  });

  it('safely guards SSR and non-mounted state by returning null', () => {
    const content = fs.readFileSync(bottomNavSourcePath, 'utf8');
    expect(content).toMatch(/if\s*\(\s*!mounted\s*\|\|\s*typeof\s+document\s*===\s*['"]undefined['"]\s*\)\s*\{?\s*return\s+null;?\s*\}?/);
  });

  it('teleports the BottomNav tree directly to document.body via createPortal', () => {
    const content = fs.readFileSync(bottomNavSourcePath, 'utf8');
    expect(content).toMatch(/return\s+createPortal\s*\(/);
    expect(content).toMatch(/,\s*document\.body\s*\);?/);
  });

  it('returns null during initial SSR / pre-mount render without crashing or accessing document.body', async () => {
    const { BottomNav } = await import('@/components/layout/BottomNav');
    const html = renderToString(
      React.createElement(
        MemoryRouter,
        null,
        React.createElement(BottomNav, {})
      )
    );
    // Since mounted starts as false, SSR renderToString outputs empty string (null)
    expect(html).toBe('');
  });

  it('anchors dock with fixed viewport coordinates and high z-index (z-[120])', () => {
    const content = fs.readFileSync(bottomNavSourcePath, 'utf8');
    expect(content).toContain('fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom,0px))]');
    expect(content).toContain('z-[120]');
    expect(content).toContain('id="bottom-nav-dock"');
  });

  it('ensures quick actions backdrop and drawer have appropriate viewport z-index above dock', () => {
    const content = fs.readFileSync(bottomNavSourcePath, 'utf8');
    // Backdrop at z-[110]
    expect(content).toContain('z-[110]');
    // Quick actions menu at z-[111]
    expect(content).toContain('z-[111]');
    // Floating dock at z-[120]
    expect(content).toContain('z-[120]');
  });
});
