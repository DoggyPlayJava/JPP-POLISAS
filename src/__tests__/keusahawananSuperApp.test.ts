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
