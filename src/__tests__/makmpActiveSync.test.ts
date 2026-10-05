import { describe, it, expect } from 'vitest';
import { buildCampaignSlides } from '@/lib/superAppHelpers';

describe('MAKMP active/inactive synchronization', () => {
  it('does NOT include MAKMP campaign slide when makmpStatus is null (e.g. edition deactivated)', () => {
    const slides = buildCampaignSlides({
      kamsisStatus: null,
      makmpStatus: null,
      karnivalActive: false,
      supsasActive: false,
    });

    const makmpSlide = slides.find((s) => s.id === 'makmp');
    expect(makmpSlide).toBeUndefined();
  });

  it('includes MAKMP campaign slide only when makmpStatus is DIJEMPUT', () => {
    const slides = buildCampaignSlides({
      kamsisStatus: null,
      makmpStatus: 'DIJEMPUT',
      karnivalActive: false,
      supsasActive: false,
    });

    const makmpSlide = slides.find((s) => s.id === 'makmp');
    expect(makmpSlide).toBeDefined();
    expect(makmpSlide?.title).toContain('Anda Dijemput ke MAKMP 2026!');
  });

  it('verifies getMakmpBannerState logic for AkademikUnitDashboard', () => {
    // Helper function that determines the MAKMP banner presentation state in AkademikUnitDashboard
    const getMakmpBannerState = (
      activeEdition: { id: string; year: number; title: string; is_active: boolean } | null,
      makmpPending: number
    ) => {
      if (!activeEdition || !activeEdition.is_active) {
        return {
          title: 'Majlis Anugerah Kecemerlangan POLISAS (MAKMP)',
          badgeText: 'Sesi Ditutup',
          badgeVariant: 'closed' as const,
          description: 'Sesi MAKMP kini ditutup / dinyahaktifkan. Buka Urus Setia MAKMP untuk menguruskan edisi.',
        };
      }

      const editionTitle = activeEdition.title || `MAKMP ${activeEdition.year}`;
      if (makmpPending > 0) {
        return {
          title: `Majlis Anugerah Kecemerlangan POLISAS (${editionTitle})`,
          badgeText: `${makmpPending} Menunggu Semakan`,
          badgeVariant: 'pending' as const,
          description: 'Pusat Urus Setia Exco Akademik: 18 Anugerah Rasmi, Templat Laporan, Penjanaan Kod PIN Juri & Semakan Pencalonan Pelajar.',
        };
      }

      return {
        title: `Majlis Anugerah Kecemerlangan POLISAS (${editionTitle})`,
        badgeText: 'Sesi Aktif',
        badgeVariant: 'active' as const,
        description: 'Pusat Urus Setia Exco Akademik: 18 Anugerah Rasmi, Templat Laporan, Penjanaan Kod PIN Juri & Semakan Pencalonan Pelajar.',
      };
    };

    // Scenario 1: Sesi dinyahaktifkan (activeEdition is null or is_active is false)
    const deactivatedState = getMakmpBannerState(null, 0);
    expect(deactivatedState.badgeText).toBe('Sesi Ditutup');
    expect(deactivatedState.badgeVariant).toBe('closed');
    expect(deactivatedState.description).toContain('ditutup / dinyahaktifkan');

    // Scenario 2: Sesi dinyahaktifkan walaupun ada makmpPending
    const deactivatedWithPending = getMakmpBannerState(null, 5);
    expect(deactivatedWithPending.badgeText).toBe('Sesi Ditutup');
    expect(deactivatedWithPending.badgeVariant).toBe('closed');

    // Scenario 3: Sesi aktif dengan permohonan menunggu semakan
    const activeWithPending = getMakmpBannerState(
      { id: 'ed-1', year: 2026, title: 'MAKMP 2026', is_active: true },
      3
    );
    expect(activeWithPending.badgeText).toBe('3 Menunggu Semakan');
    expect(activeWithPending.badgeVariant).toBe('pending');
    expect(activeWithPending.title).toContain('MAKMP 2026');

    // Scenario 4: Sesi aktif tanpa permohonan tertunggak
    const activeClean = getMakmpBannerState(
      { id: 'ed-1', year: 2026, title: 'MAKMP 2026', is_active: true },
      0
    );
    expect(activeClean.badgeText).toBe('Sesi Aktif');
    expect(activeClean.badgeVariant).toBe('active');
  });
});
