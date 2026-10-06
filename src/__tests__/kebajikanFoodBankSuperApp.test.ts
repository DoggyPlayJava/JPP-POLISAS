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

  it('integrates KebajikanLiveTrackerCard into PortalPage.tsx directly', () => {
    const portalPath = path.resolve(__dirname, '../pages/PortalPage.tsx');
    const portalRedundantPath = path.resolve(__dirname, '../pages/portal/PortalPage.tsx');

    expect(fs.existsSync(portalRedundantPath)).toBe(false);
    expect(fs.existsSync(portalPath)).toBe(true);

    const portalContent = fs.readFileSync(portalPath, 'utf-8');
    expect(portalContent).toMatch(/import\s*\{?[^}]*KebajikanLiveTrackerCard[^}]*\}?\s*from/);
    expect(portalContent).toContain('<KebajikanLiveTrackerCard');
  });
});

describe('Task 2: Borang Aduan Fasiliti Ekspres Revamp (KebajikanSubmitPage.tsx)', () => {
  const submitPagePath = path.resolve(__dirname, '../pages/kebajikan/KebajikanSubmitPage.tsx');

  it('verifies KebajikanSubmitPage.tsx file exists', () => {
    expect(fs.existsSync(submitPagePath)).toBe(true);
  });

  it('auto-fills profile details (full_name, matric_no, phone, class, gender, jabatan) from auth profile', () => {
    const content = fs.readFileSync(submitPagePath, 'utf-8');

    // Auto profile mapping logic from profile and user
    expect(content).toMatch(/useAuth/);
    expect(content).toMatch(/getInitialProfileData/);
    expect(content).toMatch(/full_name/);
    expect(content).toMatch(/matric_no/);
    expect(content).toMatch(/phone/);
    expect(content).toMatch(/class/);
    expect(content).toMatch(/gender/);
    expect(content).toMatch(/jabatan/);

    // Dynamic re-sync on profile or user update
    expect(content).toMatch(/useEffect\(\s*\(\)\s*=>\s*\{[\s\S]*profile[\s\S]*user[\s\S]*\}\s*,\s*\[profile,\s*user\]\)/);
  });

  it('implements direct camera capture with capture="environment" and accept="image/*"', () => {
    const content = fs.readFileSync(submitPagePath, 'utf-8');

    // Must have camera capture input attribute
    expect(content).toContain('capture="environment"');
    expect(content).toContain('accept="image/*"');
    expect(content).toMatch(/<input[^>]*capture="environment"/);
  });

  it('imports and invokes compressImage for fast client-side compression', () => {
    const content = fs.readFileSync(submitPagePath, 'utf-8');

    // Must import compressImage from imageCompression
    expect(content).toMatch(/import\s*\{[^}]*compressImage[^}]*\}\s*from\s*['"]@\/lib\/imageCompression['"]/);
    // Must call compressImage
    expect(content).toMatch(/await\s+compressImage/);
  });

  it('implements mobile sticky bottom summary capsule with required tokens and Semak & Hantar CTA', () => {
    const content = fs.readFileSync(submitPagePath, 'utf-8');

    const expectedCapsuleTokens = 'fixed bottom-4 left-4 right-4 z-40 bg-slate-900/95 dark:bg-slate-900/95 text-white p-3 rounded-2xl shadow-xl backdrop-blur-md flex items-center justify-between border border-white/10';
    expect(content).toContain(expectedCapsuleTokens);
    expect(content).toContain('Semak & Hantar');
  });

  it('implements slide-up bottom sheet / review modal with Sahkan & Hantar Aduan CTA', () => {
    const content = fs.readFileSync(submitPagePath, 'utf-8');

    // Slide-up sheet presence
    expect(content).toContain('showReviewModal');
    expect(content).toContain('Semak & Sahkan Aduan');
    expect(content).toContain('Sahkan & Hantar Aduan');
    expect(content).toContain('Kembali Edit');
  });

  it('strictly contains zero raw banned emojis in KebajikanSubmitPage.tsx', () => {
    const content = fs.readFileSync(submitPagePath, 'utf-8');
    const hasEmoji = BANNED_EMOJI_REGEX.test(content);
    expect(hasEmoji).toBe(false);
  });

  it('uses high-contrast visual category cards with 100% Lucide vector icons', () => {
    const content = fs.readFileSync(submitPagePath, 'utf-8');

    // Category Lucide icons
    expect(content).toContain('Building2');
    expect(content).toContain('Dumbbell');
    expect(content).toContain('Coffee');
    expect(content).toContain('Wifi');
    expect(content).toContain('MoreHorizontal');

    // Categories array
    expect(content).toContain('FASILITI_JABATAN');
    expect(content).toContain('FASILITI_SUKAN');
    expect(content).toContain('KAFETERIA');
    expect(content).toContain('WIFI_KAMSIS');
    expect(content).toContain('LAIN_LAIN');
  });

  it('preserves database inserts, notifications, and email integration', () => {
    const content = fs.readFileSync(submitPagePath, 'utf-8');

    // Database ticket creation
    expect(content).toContain("supabase.from('kebajikan_tickets').insert");
    expect(content).toContain("supabase.from('kebajikan_ticket_comments').insert");

    // Notifications
    expect(content).toContain('sendNotificationToUser');
    expect(content).toContain('sendNotificationToKebajikanExco');
    expect(content).toContain('sendNotificationToKKExco');

    // Email
    expect(content).toContain('sendEmail');
  });
});

describe('Task 3: FoodBank Siswa Revamp — Smart Pantry, Sticky Capsule & QR Pass (KebajikanFoodBankPage.tsx)', () => {
  const foodbankPagePath = path.resolve(__dirname, '../pages/kebajikan/KebajikanFoodBankPage.tsx');

  it('verifies KebajikanFoodBankPage.tsx file exists and exports KebajikanFoodBankPage', async () => {
    expect(fs.existsSync(foodbankPagePath)).toBe(true);
    const mod = await import('@/pages/kebajikan/KebajikanFoodBankPage');
    expect(mod.KebajikanFoodBankPage).toBeDefined();
    expect(typeof mod.KebajikanFoodBankPage).toBe('function');
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe('function');
  });

  it('implements dual-mode package selection: Ready Care Box and Smart Pantry Basket', () => {
    const content = fs.readFileSync(foodbankPagePath, 'utf-8');
    expect(content).toContain('Ready Care Box');
    expect(content).toContain('Smart Pantry Basket');
    expect(content).toContain("'READY_BOX'");
    expect(content).toContain("'SMART_PANTRY'");
    expect(content).toContain('handleSelectReadyCareBox');
    expect(content).toContain('READY_CARE_BOX_PRESETS');
  });

  it('implements mobile Sticky Pantry Bottom Capsule with required tokens and text', () => {
    const content = fs.readFileSync(foodbankPagePath, 'utf-8');
    const expectedCapsuleTokens =
      'fixed bottom-4 left-4 right-4 z-40 bg-slate-900/95 dark:bg-slate-900/95 text-white p-3 rounded-2xl shadow-xl backdrop-blur-md flex items-center justify-between border border-white/10';
    expect(content).toContain(expectedCapsuleTokens);
    expect(content).toContain('Item Dipilih');
    expect(content).toContain('Baki Kuota');
    expect(content).toContain('Semak Bakul');
  });

  it('implements Slide-Up Pantry Bottom Sheet with quota tracking and quick action CTA', () => {
    const content = fs.readFileSync(foodbankPagePath, 'utf-8');
    expect(content).toContain('showBasketSheet');
    expect(content).toContain('Teruskan ke Pengesahan Slot');
    expect(content).toContain('remainingQuota');
    expect(content).toContain('totalQuota');
    expect(content).toContain('usedQuota');
    expect(content).toContain('Smart Pantry Basket');
  });

  it('upgrades active application view into a stylish Digital QR Boarding Pass', () => {
    const content = fs.readFileSync(foodbankPagePath, 'utf-8');
    expect(content).toContain('Pas Pengambilan Digital');
    expect(content).toContain('QRCodeSVG');
    expect(content).toContain('Muat Turun / Tangkap Layar Pas');
    expect(content).toContain('polymaps');
    expect(content).toContain('pickup_qr_code');
    expect(content).toContain('pickup_time_slot');
    expect(content).toContain('Lokasi Pengagihan');
  });

  it('strictly contains zero raw banned emojis in KebajikanFoodBankPage.tsx', () => {
    const content = fs.readFileSync(foodbankPagePath, 'utf-8');
    const hasEmoji = BANNED_EMOJI_REGEX.test(content);
    expect(hasEmoji).toBe(false);
  });

  it('preserves database mutations, notifications, housemate calculations, and email integration', () => {
    const content = fs.readFileSync(foodbankPagePath, 'utf-8');
    expect(content).toMatch(/from\(['"]foodbank_applications['"]\)\s*\.insert/);
    expect(content).toContain('sendNotificationToKebajikanExco');
    expect(content).toContain('buildFoodBankEmail');
    expect(content).toContain('sendEmail');
    expect(content).toContain('maxAllowedItems');
    expect(content).toContain('itemsPerPerson');
  });
});

describe('Task 4: High-Contrast Obsidian Emerald Scanner HUD & Zero-Overflow Admin Tables (JppFoodBankAdmin.tsx)', () => {
  const adminPagePath = path.resolve(__dirname, '../pages/jpp/JppFoodBankAdmin.tsx');

  it('verifies JppFoodBankAdmin.tsx file exists and exports JppFoodBankAdmin', async () => {
    expect(fs.existsSync(adminPagePath)).toBe(true);
    const mod = await import('@/pages/jpp/JppFoodBankAdmin');
    expect(mod.JppFoodBankAdmin).toBeDefined();
    expect(typeof mod.JppFoodBankAdmin).toBe('function');
  });

  it('implements High-Contrast Obsidian Emerald Scanner HUD with viewfinder, laser sweep, and neon tokens', () => {
    const content = fs.readFileSync(adminPagePath, 'utf-8');
    // Viewfinder border & shadow token
    expect(content).toContain('border-2 border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.25)]');
    // Giant thumb button token
    expect(content).toContain('SAHKAN SERAHAN MAKANAN');
    // Haptic vibration
    expect(content).toContain('vibrate');
    // Scanner container & laser HUD
    expect(content).toContain('foodbank-counter-qr-reader');
    expect(content).toMatch(/Laser/i);
  });

  it('implements fallback manual matric search input with required placeholder and instant lookup', () => {
    const content = fs.readFileSync(adminPagePath, 'utf-8');
    expect(content).toContain('Cari No. Matrik secara manual...');
    expect(content).toContain('handleLookupOrVerify');
  });

  it('renders High-Contrast Student Identification Card in obsidian glass with bold details and 1-tap fulfillment', () => {
    const content = fs.readFileSync(adminPagePath, 'utf-8');
    expect(content).toContain('effectiveName');
    expect(content).toContain('effectiveMatric');
    expect(content).toContain('selected_items');
    expect(content).toContain('handleExecuteFulfillment');
    expect(content).toContain('verify_and_complete_foodbank_pickup');
  });

  it('wraps inventory table, applications table, and budget transaction ledger in w-full max-w-full overflow-x-auto scrollbar-hide', () => {
    const content = fs.readFileSync(adminPagePath, 'utf-8');
    expect(content).toContain('w-full max-w-full overflow-x-auto scrollbar-hide');
  });

  it('strictly contains zero raw banned emojis across JppFoodBankAdmin.tsx source', () => {
    const content = fs.readFileSync(adminPagePath, 'utf-8');
    const hasEmoji = BANNED_EMOJI_REGEX.test(content);
    expect(hasEmoji).toBe(false);
  });

  it('preserves backend RPCs, RBAC gating, budget calculations, and export functions', () => {
    const content = fs.readFileSync(adminPagePath, 'utf-8');
    expect(content).toContain('verify_and_complete_foodbank_pickup');
    expect(content).toContain('foodbank_budget_transactions');
    expect(content).toContain('OFFICIAL_BASELINE_BUDGET');
    expect(content).toContain('exportXlsx');
    expect(content).toContain('isExecutiveAdmin');
  });
});

