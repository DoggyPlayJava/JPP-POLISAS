import { describe, it, expect } from 'vitest';
import { formatGreeting, filterUpcomingEvents, buildCampaignSlides } from '@/lib/superAppHelpers';

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
});
