import { describe, it, expect } from 'vitest';
import {
  formatGreeting,
  filterUpcomingEvents,
  buildCampaignSlides,
  getRoleBadgeTitle,
  getHeaderGradientClass,
  getCampusServicesConfig,
} from '@/lib/superAppHelpers';

describe('superAppHelpers', () => {
  it('formats appropriate greetings according to the hour of day', () => {
    expect(formatGreeting(8, 'Aiman').title).toBe('Selamat Pagi,');
    expect(formatGreeting(14, 'Aiman').title).toBe('Selamat Petang,');
    expect(formatGreeting(21, 'Aiman').title).toBe('Selamat Malam,');
    expect(formatGreeting(2, 'Aiman').title).toBe('Masih Berjaga,');
  });

  it('filters and sorts upcoming events correctly', () => {
    const mockEvents = [
      { id: '1', title: 'Past Event', event_date: '2020-01-01', status: 'COMPLETED' },
      { id: '2', title: 'Live Event', event_date: '2026-10-10', status: 'PUBLISHED' },
      { id: '3', title: 'Future Event', event_date: '2026-11-15', status: 'PUBLISHED' },
    ];
    const upcoming = filterUpcomingEvents(mockEvents);
    expect(upcoming.length).toBe(2);
    expect(upcoming[0].id).toBe('2');
  });

  it('builds dynamic campaign slides based on user state', () => {
    const slides = buildCampaignSlides({
      kamsisStatus: 'APPROVED',
      makmpStatus: 'DIJEMPUT',
      karnivalActive: true,
      supsasActive: false,
    });

    expect(slides.some(s => s.id === 'makmp')).toBe(true);
    expect(slides.some(s => s.id === 'kamsis')).toBe(true);
    expect(slides.some(s => s.id === 'karnival')).toBe(true);
    expect(slides.some(s => s.id === 'supsas')).toBe(false);
  });

  describe('SuperAppHeader logic', () => {
    it('resolves role badge title correctly for various roles', () => {
      expect(getRoleBadgeTitle('SUPERADMIN')).toBe('PENTADBIR UTAMA');
      expect(getRoleBadgeTitle('SUPER_ADMIN_JPP')).toBe('PENTADBIR UTAMA');
      expect(getRoleBadgeTitle('JPP')).toBe('MAJLIS JPP');
      expect(getRoleBadgeTitle('STUDENT')).toBe('SISWA POLISAS');
      expect(getRoleBadgeTitle(undefined)).toBe('SISWA POLISAS');
      expect(getRoleBadgeTitle('')).toBe('SISWA POLISAS');
    });

    it('selects theme gradient class based on karnivalActive and supsasActive state', () => {
      // Karnival active
      const karnivalGrad = getHeaderGradientClass(true, false);
      expect(karnivalGrad).toContain('violet');

      // SUPSAS active
      const supsasGrad = getHeaderGradientClass(false, true);
      expect(supsasGrad).toContain('amber');

      // Default portal state
      const defaultGrad = getHeaderGradientClass(false, false);
      expect(defaultGrad).toContain('emerald');
    });

    it('exports SuperAppHeader component correctly', async () => {
      const { SuperAppHeader } = await import('@/components/portal/SuperAppHeader');
      expect(SuperAppHeader).toBeDefined();
      expect(typeof SuperAppHeader).toBe('function');
    });
  });

  describe('getCampusServicesConfig & CampusServicesGrid', () => {
    it('returns exactly 8 core campus services in expected IDs', () => {
      const services = getCampusServicesConfig({ kamsisStatus: null });
      expect(services).toHaveLength(8);
      const ids = services.map(s => s.id);
      expect(ids).toEqual([
        'polyrider',
        'polymart',
        'polyservices',
        'kamsis',
        'ems',
        'kebajikan',
        'akademik_qr',
        'ekpp',
      ]);
      services.forEach(s => {
        expect(s.id).toBeTruthy();
        expect(s.label).toBeTruthy();
        expect(s.routeOrAction).toBeTruthy();
      });
    });

    it("attaches 'LULUS' badge when kamsisStatus === 'APPROVED'", () => {
      const services = getCampusServicesConfig({ kamsisStatus: 'APPROVED' });
      const kamsis = services.find(s => s.id === 'kamsis');
      expect(kamsis).toBeDefined();
      expect(kamsis?.badge).toBe('LULUS');

      const nonApproved = getCampusServicesConfig({ kamsisStatus: 'PENDING' });
      const nonApprovedKamsis = nonApproved.find(s => s.id === 'kamsis');
      expect(nonApprovedKamsis?.badge).toBeUndefined();
    });

    it('attaches active ticket count badge when kbOpenCount > 0', () => {
      const servicesWithTickets = getCampusServicesConfig({ kamsisStatus: null, kbOpenCount: 4 });
      const kb = servicesWithTickets.find(s => s.id === 'kebajikan');
      expect(kb).toBeDefined();
      expect(kb?.badge).toBe('4');

      const servicesWithoutTickets = getCampusServicesConfig({ kamsisStatus: null, kbOpenCount: 0 });
      const kbZero = servicesWithoutTickets.find(s => s.id === 'kebajikan');
      expect(kbZero?.badge).toBeUndefined();
    });

    it('exports CampusServicesGrid component correctly', async () => {
      const { CampusServicesGrid } = await import('@/components/portal/CampusServicesGrid');
      expect(CampusServicesGrid).toBeDefined();
      expect(typeof CampusServicesGrid).toBe('function');
    });
  });
});


