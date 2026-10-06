import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import fs from 'fs';
import path from 'path';

// Banned Unicode emoji regex (anti-slop rule)
const BANNED_EMOJI_REGEX = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/u;

describe('Task 1: KebajikanLiveTrackerCard Component & Integration', () => {
  it('exports KebajikanLiveTrackerCard as named and default export', async () => {
    const mod = await import('@/components/kebajikan/KebajikanLiveTrackerCard');
    expect(mod.KebajikanLiveTrackerCard).toBeDefined();
    expect(typeof mod.KebajikanLiveTrackerCard).toBe('function');
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe('function');
  });

  it('renders null when neither ticket nor foodbank application is present', async () => {
    const { KebajikanLiveTrackerCard } = await import('@/components/kebajikan/KebajikanLiveTrackerCard');
    const htmlNull = renderToString(
      React.createElement(MemoryRouter, null, React.createElement(KebajikanLiveTrackerCard, {
        ticket: null,
        foodbankApp: null,
      }))
    );
    expect(htmlNull).toBe('');

    const htmlUndefined = renderToString(
      React.createElement(MemoryRouter, null, React.createElement(KebajikanLiveTrackerCard, {}))
    );
    expect(htmlUndefined).toBe('');
  });

  it('renders null when both ticket and foodbank app are in inactive/completed states', async () => {
    const { KebajikanLiveTrackerCard } = await import('@/components/kebajikan/KebajikanLiveTrackerCard');
    const html = renderToString(
      React.createElement(MemoryRouter, null, React.createElement(KebajikanLiveTrackerCard, {
        ticket: { id: 't-1', status: 'RESOLVED', title: 'Paip Bocor' },
        foodbankApp: { id: 'fb-1', status: 'SELESAI', application_no: 'FB-001' },
      }))
    );
    expect(html).toBe('');
  });

  it('renders parcel-style pulse stepper for active FoodBank application', async () => {
    const { KebajikanLiveTrackerCard } = await import('@/components/kebajikan/KebajikanLiveTrackerCard');
    const mockApp = {
      id: 'fb-101',
      application_no: 'FB-2026-089',
      status: 'APPROVED',
      pickup_time_slot: '10:00 AM - 11:30 AM',
      pickup_date: '2026-10-12',
      location: {
        id: 'loc-1',
        name: 'Pusat Edaran Kaunter JHEP',
        room_detail: 'Aras 1, Pentadbiran',
      },
    };

    const html = renderToString(
      React.createElement(MemoryRouter, null, React.createElement(KebajikanLiveTrackerCard, {
        foodbankApp: mockApp,
      }))
    );

    // Header & Info
    expect(html).toContain('Permohonan Food Bank JPP');
    expect(html).toContain('FB-2026-089');
    expect(html).toContain('Pusat Edaran Kaunter JHEP');
    expect(html).toContain('10:00 AM - 11:30 AM');

    // Stepper steps
    expect(html).toContain('Permohonan Diterima');
    expect(html).toContain('Pakej Disediakan');
    expect(html).toContain('Sedia Diambil');

    // Active pulse token
    expect(html).toContain('animate-ping');

    // Quick action CTA
    expect(html).toContain('Tunjuk Pas QR');
  });

  it('renders pending FoodBank application with awaiting state', async () => {
    const { KebajikanLiveTrackerCard } = await import('@/components/kebajikan/KebajikanLiveTrackerCard');
    const mockApp = {
      id: 'fb-102',
      application_no: 'FB-2026-090',
      status: 'PENDING',
      pickup_time_slot: '02:30 PM - 04:00 PM',
      location: {
        name: 'Kaunter Bantuan Kamsis',
      },
    };

    const html = renderToString(
      React.createElement(MemoryRouter, null, React.createElement(KebajikanLiveTrackerCard, {
        foodbankApp: mockApp,
      }))
    );

    expect(html).toContain('Permohonan Food Bank JPP');
    expect(html).toContain('Permohonan Diterima');
    expect(html).toContain('Pakej Disediakan');
    expect(html).toContain('Tunjuk Pas QR');
  });

  it('renders parcel-style pulse stepper for active welfare ticket', async () => {
    const { KebajikanLiveTrackerCard } = await import('@/components/kebajikan/KebajikanLiveTrackerCard');
    const mockTicket = {
      id: 't-201',
      ticket_no: 'KBJ-2026-0042',
      title: 'Kerosakan Penghawa Dingin Dewan Kuliah',
      category: 'FASILITI_JABATAN',
      status: 'IN_PROGRESS',
      created_at: new Date().toISOString(),
      sla_deadline: new Date(Date.now() + 86400000).toISOString(),
    };

    const html = renderToString(
      React.createElement(MemoryRouter, null, React.createElement(KebajikanLiveTrackerCard, {
        ticket: mockTicket,
      }))
    );

    // Title & Meta
    expect(html).toContain('Aduan Fasiliti');
    expect(html).toContain('Kerosakan Penghawa Dingin Dewan Kuliah');
    expect(html).toContain('KBJ-2026-0042');
    expect(html).toContain('SLA: 24-48 Jam Bekerja');

    // Stepper steps
    expect(html).toContain('Dihantar');
    expect(html).toContain('Disemak JPP');
    expect(html).toContain('Tindakan Unit Fasiliti');
    expect(html).toContain('Selesai');

    // Active pulse token
    expect(html).toContain('animate-ping');

    // Quick action CTA
    expect(html).toContain('Buka Sembang Aduan');
  });

  it('renders both active ticket and foodbank application when both exist', async () => {
    const { KebajikanLiveTrackerCard } = await import('@/components/kebajikan/KebajikanLiveTrackerCard');
    const mockTicket = {
      id: 't-301',
      ticket_no: 'KBJ-2026-0077',
      title: 'Lampu Koridor Blok C Rosak',
      category: 'WIFI_KAMSIS',
      status: 'PENDING',
    };
    const mockApp = {
      id: 'fb-301',
      application_no: 'FB-2026-112',
      status: 'APPROVED',
      pickup_time_slot: '11:30 AM - 01:00 PM',
      location: { name: 'Pusat Edaran Kaunter JHEP' },
    };

    const html = renderToString(
      React.createElement(MemoryRouter, null, React.createElement(KebajikanLiveTrackerCard, {
        ticket: mockTicket,
        foodbankApp: mockApp,
      }))
    );

    expect(html).toContain('Aduan Fasiliti');
    expect(html).toContain('KBJ-2026-0077');
    expect(html).toContain('Buka Sembang Aduan');
    expect(html).toContain('Permohonan Food Bank JPP');
    expect(html).toContain('FB-2026-112');
    expect(html).toContain('Tunjuk Pas QR');
  });

  it('contains zero raw banned emojis in KebajikanLiveTrackerCard.tsx source', () => {
    const filePath = path.resolve(__dirname, '../components/kebajikan/KebajikanLiveTrackerCard.tsx');
    expect(fs.existsSync(filePath)).toBe(true);
    const content = fs.readFileSync(filePath, 'utf-8');
    const hasEmoji = BANNED_EMOJI_REGEX.test(content);
    expect(hasEmoji).toBe(false);
  });

  it('integrates KebajikanLiveTrackerCard into KebajikanHubPage.tsx with Promise.all', () => {
    const hubPath = path.resolve(__dirname, '../pages/kebajikan/KebajikanHubPage.tsx');
    const hubContent = fs.readFileSync(hubPath, 'utf-8');

    // Must import tracker component
    expect(hubContent).toMatch(/import\s*\{?[^}]*KebajikanLiveTrackerCard[^}]*\}?\s*from/);

    // Must render tracker component
    expect(hubContent).toContain('<KebajikanLiveTrackerCard');

    // Must use Promise.all to fetch concurrent active data
    expect(hubContent).toContain('Promise.all');

    // Must not contain raw emojis
    expect(BANNED_EMOJI_REGEX.test(hubContent)).toBe(false);
  });

  it('integrates KebajikanLiveTrackerCard into PortalPage.tsx', () => {
    // Check both potential locations
    const portalCandidatePath1 = path.resolve(__dirname, '../pages/portal/PortalPage.tsx');
    const portalCandidatePath2 = path.resolve(__dirname, '../pages/PortalPage.tsx');

    const fileToTest = fs.existsSync(portalCandidatePath1) ? portalCandidatePath1 : portalCandidatePath2;
    const portalContent = fs.readFileSync(fileToTest, 'utf-8');

    expect(portalContent).toMatch(/import\s*\{?[^}]*KebajikanLiveTrackerCard[^}]*\}?\s*from/);
    expect(portalContent).toContain('<KebajikanLiveTrackerCard');
  });
});
