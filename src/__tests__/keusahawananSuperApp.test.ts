import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-123' },
    profile: { id: 'test-user-123', full_name: 'Aiman Farhan' },
    hasKeusahawananAccess: true,
    isSuperAdmin: false,
  }),
}));

vi.mock('@/contexts/ExcoThemeContext', () => ({
  useExcoTheme: () => ({
    color: '#1B5E20',
  }),
  ExcoThemeProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('@/contexts/BusinessSwitcherContext', () => ({
  useBusinessSwitcher: () => ({
    selectedBusiness: { id: 'biz-123', name: 'Koperasi Siswa' },
    allBusinesses: [{ id: 'biz-123', name: 'Koperasi Siswa' }],
    canSwitch: true,
    isLoading: false,
    refreshBusinesses: vi.fn(),
  }),
  BusinessSwitcherProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('@/hooks/useBusinessData', () => ({
  useBusinessData: () => ({
    myMemberships: [],
    isLoading: false,
  }),
}));

vi.mock('@/hooks/useTour', () => ({
  useTour: () => ({
    runTour: false,
    startTour: vi.fn(),
    closeTour: vi.fn(),
  }),
}));

vi.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({
    isLowPerf: false,
  }),
}));

describe('KeusahawananDashboard PolyMart Hub Card & Zero Overflow', () => {
  const dashboardPath = path.resolve(__dirname, '../pages/keusahawanan/KeusahawananDashboard.tsx');
  const source = fs.readFileSync(dashboardPath, 'utf-8');

  it('contains PolyMart Hub Card tokens in KeusahawananDashboard.tsx', () => {
    // 1. Link to merchant storefront in PolyMart
    expect(source).toContain('/polymart/kedai/');

    // 2. Friendly empty state action CTA
    expect(source).toContain('Terbitkan Produk ke PolyMart');

    // 3. Active storefront header badge
    expect(source).toContain('Etalase PolyMart Aktif');
  });

  it('queries active PolyMart products and pending orders in KeusahawananDashboard.tsx', () => {
    expect(source).toContain('publish_to_polymart');
    expect(source).toContain('polymart_orders');
    expect(source).toContain('PENDING');
    expect(source).toContain('CONFIRMED');
    expect(source).toContain('READY');
  });

  it('strictly wraps product heatmap table to eliminate horizontal overflow', () => {
    expect(source).toContain('w-full max-w-full overflow-x-auto scrollbar-hide');
    expect(source).toContain('min-w-max');
  });

  it('contains zero raw emoji pictographs in KeusahawananDashboard.tsx', () => {
    const emojiRegex = /[\u{1F300}-\u{1FAFF}]/gu;
    const matches = source.match(emojiRegex);
    expect(matches).toBeNull();
  });

  it('imports cn utility from @/lib/utils in KeusahawananDashboard.tsx', () => {
    const dashboardSrc = source;
    expect(dashboardSrc).toMatch(/import\s*\{[^}]*cn[^}]*\}\s*from\s*['"]@\/lib\/utils['"]/);
  });
});

describe('KeusahawananLayout Zero Horizontal Overflow', () => {
  const layoutPath = path.resolve(__dirname, '../pages/keusahawanan/KeusahawananLayout.tsx');
  const source = fs.readFileSync(layoutPath, 'utf-8');

  it('contains overflow-x-hidden on the main container', () => {
    expect(source).toContain('overflow-x-hidden');
    expect(source).toContain('max-w-full');
  });
});

describe('BusinessShiftModule Table Overflow Protection', () => {
  const shiftPath = path.resolve(__dirname, '../pages/keusahawanan/BusinessShiftModule.tsx');
  const source = fs.readFileSync(shiftPath, 'utf-8');

  it('wraps the shift schedule table with overflow-x-auto and max-w-full', () => {
    expect(source).toContain('overflow-x-auto');
    expect(source).toContain('max-w-full');
    expect(source).toContain('min-w-[600px]');
  });
});

describe('UrusPerniagaanPage Consolidated 3 Core Domains', () => {
  const urusPath = path.resolve(__dirname, '../pages/keusahawanan/UrusPerniagaanPage.tsx');
  const source = fs.readFileSync(urusPath, 'utf-8');

  it('defines the 3 consolidated domains (profil, pasukan, kupon_log)', () => {
    expect(source).toContain("'profil'");
    expect(source).toContain("'pasukan'");
    expect(source).toContain("'kupon_log'");
    expect(source).toContain("key: 'profil'");
    expect(source).toContain("key: 'pasukan'");
    expect(source).toContain("key: 'kupon_log'");
  });

  it('replaces old micro-tabs (identiti, ciri, staff, pos, etc.) from the tabs array', () => {
    expect(source).not.toContain("key: 'identiti'");
    expect(source).not.toContain("key: 'staff'");
    expect(source).not.toContain("key: 'pos'");
    expect(source).not.toContain("key: 'ciri'");
    expect(source).not.toContain("key: 'syif'");
    expect(source).not.toContain("key: 'sesi'");
    expect(source).not.toContain("key: 'log'");
  });

  it('renders modern segmented thumb-friendly pill tab bar with Store, Users, and Tag icons', () => {
    expect(source).toMatch(/import\s*\{[^}]*Store[^}]*\}\s*from\s*['"]lucide-react['"]/);
    expect(source).toMatch(/import\s*\{[^}]*Users[^}]*\}\s*from\s*['"]lucide-react['"]/);
    expect(source).toMatch(/import\s*\{[^}]*Tag[^}]*\}\s*from\s*['"]lucide-react['"]/);
    expect(source).toContain('tour-urus-nav');
    expect(source).toContain('Profil & Kedai');
    expect(source).toContain('Pasukan & Operasi');
    expect(source).toContain('Kupon & Log Audit');
    expect(source).toContain('rounded-2xl bg-muted/40 border border-border/50 max-w-xl');
  });

  it('contains zero raw emoji pictographs in UrusPerniagaanPage.tsx', () => {
    const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2300}-\u{23FF}]/gu;
    const matches = source.match(emojiRegex);
    expect(matches).toBeNull();
  });

  it('preserves essential sub-modules and functions', () => {
    expect(source).toContain('<BusinessJadual');
    expect(source).toContain('<SesiBusiness');
    expect(source).toContain('handleSavePaymentSettings');
    expect(source).toContain('handleTransferOwnership');
    expect(source).toContain('handleAddPromo');
  });
});

