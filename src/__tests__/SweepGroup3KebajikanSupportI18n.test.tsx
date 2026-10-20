import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n, { changeLanguage } from '@/lib/i18n';
import fs from 'fs';
import path from 'path';

// Polyfills for Node environment
if (typeof globalThis.localStorage === 'undefined') {
  let store: Record<string, string> = {};
  (globalThis as any).localStorage = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, val: string) => {
      store[key] = String(val);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    key: (i: number) => Object.keys(store)[i] ?? null,
    get length() {
      return Object.keys(store).length;
    },
  };
}

if (typeof globalThis.sessionStorage === 'undefined') {
  let store: Record<string, string> = {};
  (globalThis as any).sessionStorage = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, val: string) => {
      store[key] = String(val);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
}

// Mock React.lazy
vi.spyOn(React, 'lazy').mockImplementation((_loader: any) => {
  return ((_props: any) => null) as any;
});

// Mock recharts for SSR renderToString
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => React.createElement('div', { className: 'recharts-responsive-container' }, children),
  BarChart: ({ children }: any) => React.createElement('div', { className: 'recharts-bar-chart' }, children),
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  CartesianGrid: () => null,
  PieChart: ({ children }: any) => React.createElement('div', { className: 'recharts-pie-chart' }, children),
  Pie: ({ children }: any) => React.createElement('div', { className: 'recharts-pie' }, children),
  Cell: () => null,
  Legend: () => null,
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, style, ...props }: any) => (
      React.createElement('div', { className, style, ...props }, children)
    ),
    h1: ({ children, className, ...props }: any) => (
      React.createElement('h1', { className, ...props }, children)
    ),
    h2: ({ children, className, ...props }: any) => (
      React.createElement('h2', { className, ...props }, children)
    ),
    h3: ({ children, className, ...props }: any) => (
      React.createElement('h3', { className, ...props }, children)
    ),
    p: ({ children, className, ...props }: any) => (
      React.createElement('p', { className, ...props }, children)
    ),
    button: ({ children, className, ...props }: any) => (
      React.createElement('button', { className, ...props }, children)
    ),
    span: ({ children, className, ...props }: any) => (
      React.createElement('span', { className, ...props }, children)
    ),
  },
  AnimatePresence: ({ children }: any) => children,
}));

// Mock Supabase
vi.mock('@/lib/supabase', () => {
  const mockFrom = vi.fn((tableName: string) => {
    return {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'ticket-123',
                ticket_no: 'TKT-2026-001',
                title: 'Kerosakan Pili Air Asrama',
                description: 'Pili air di aras 2 rosak dan bocor.',
                category: 'FASILITI_JABATAN',
                status: 'NEW',
                created_at: new Date().toISOString(),
                resolution_note: null,
                rating: null,
              },
              error: null,
            }),
            order: vi.fn().mockResolvedValue({ data: [] }),
            maybeSingle: vi.fn().mockResolvedValue({ data: null }),
            limit: vi.fn().mockResolvedValue({ data: [] }),
          })),
          order: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue({ data: [] }),
          })),
          maybeSingle: vi.fn().mockResolvedValue({ data: null }),
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'ticket-123',
              ticket_no: 'TKT-2026-001',
              title: 'Kerosakan Pili Air Asrama',
              description: 'Pili air di aras 2 rosak dan bocor.',
              category: 'FASILITI_JABATAN',
              status: 'NEW',
              created_at: new Date().toISOString(),
              resolution_note: null,
              rating: null,
            },
            error: null,
          }),
          limit: vi.fn().mockResolvedValue({ data: [] }),
          not: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({ data: null }),
              })),
            })),
          })),
          in: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({ data: null }),
              })),
            })),
          })),
        })),
        single: vi.fn().mockResolvedValue({
          data: {
            total_tickets: 100,
            total_resolved: 92,
            total_active: 8,
            total_escalated: 1,
            resolution_rate: 92,
            avg_resolution_hours: 14,
            avg_rating: 4.8,
            this_month_received: 12,
            this_month_resolved: 11,
          },
          error: null,
        }),
        in: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue({ data: [] }),
          })),
        })),
        order: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue({ data: [] }),
        })),
        limit: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { is_module_active: true, is_application_open: true },
          }),
        })),
        maybeSingle: vi.fn().mockResolvedValue({ data: null }),
      })),
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })),
    };
  });

  return {
    supabase: {
      from: mockFrom,
      rpc: vi.fn((fnName: string) => {
        if (fnName === 'get_kebajikan_monthly_stats') {
          return Promise.resolve({
            data: [
              { month_label: 'Mei', received: 15, resolved: 14, avg_hours: 12 },
              { month_label: 'Jun', received: 20, resolved: 19, avg_hours: 10 },
            ],
          });
        }
        if (fnName === 'get_kebajikan_category_stats') {
          return Promise.resolve({
            data: [
              { category: 'FASILITI_JABATAN', total: 40, resolved: 38, percentage: 40 },
              { category: 'KAFETERIA', total: 30, resolved: 28, percentage: 30 },
            ],
          });
        }
        if (fnName === 'get_kebajikan_recent_ratings') {
          return Promise.resolve({
            data: [
              { rating: 5, rating_comment: 'Tindakan pantas dan memuaskan!', category: 'FASILITI_JABATAN' },
            ],
          });
        }
        return Promise.resolve({ data: [] });
      }),
      channel: vi.fn(() => ({
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis(),
      })),
      removeChannel: vi.fn(),
    },
  };
});

// Mock AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-123', email: 'student@polisas.edu.my' },
    profile: {
      id: 'user-123',
      full_name: 'Farhan Azman',
      role: 'STUDENT',
    },
    isKebajikanExco: true,
    isKediamanExco: false,
    isSuperAdmin: true,
    isYdp: false,
  }),
}));

// Mock ThemeContext
vi.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'light',
    toggleTheme: vi.fn(),
  }),
}));

// Mock NotificationStore
vi.mock('@/store/useNotificationStore', () => ({
  useNotificationStore: (selector: any) => {
    const state = {
      unreadCount: 0,
      notifs: [],
      markRead: vi.fn(),
    };
    return selector(state);
  },
}));

// Mock SystemTour
vi.mock('@/components/ui/SystemTour', () => ({
  SystemTour: () => null,
}));

vi.mock('@/hooks/useTour', () => ({
  useTour: () => ({
    runTour: false,
    startTour: vi.fn(),
    closeTour: vi.fn(),
  }),
}));

// Components under test
import { KebajikanDashboard } from '@/pages/kebajikan/KebajikanDashboard';
import { KebajikanHubPage } from '@/pages/kebajikan/KebajikanHubPage';
import { KebajikanMyTickets } from '@/pages/kebajikan/KebajikanMyTickets';
import { KebajikanStatsPage } from '@/pages/kebajikan/KebajikanPublicStats';
import { KebajikanStaffPage } from '@/pages/kebajikan/KebajikanStaffPage';
import { KebajikanStudentChat } from '@/pages/kebajikan/KebajikanStudentChat';
import { KebajikanEmptyState } from '@/pages/kebajikan/KebajikanPlaceholders';
import { KebajikanLiveTrackerCard } from '@/components/kebajikan/KebajikanLiveTrackerCard';

function renderWithI18n(ui: React.ReactElement, lang: 'ms' | 'en') {
  changeLanguage(lang);
  return renderToString(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter initialEntries={['/kebajikan/aduan/ticket-123']}>
        {ui}
      </MemoryRouter>
    </I18nextProvider>
  );
}

describe('Sweep Group 3: Kebajikan, FoodBank & Support Chat Deep-Localization', () => {
  beforeEach(() => {
    changeLanguage('ms');
  });

  describe('1. Dictionary Parity & Quality Standards', () => {
    it('kebajikan.json has exact key parity and non-empty strings between ms and en', () => {
      const msJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../locales/ms/kebajikan.json'), 'utf-8'));
      const enJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../locales/en/kebajikan.json'), 'utf-8'));
      const msKeys = Object.keys(msJson).sort();
      const enKeys = Object.keys(enJson).sort();

      expect(msKeys).toEqual(enKeys);
      expect(msKeys.length).toBeGreaterThan(500);

      for (const key of msKeys) {
        expect(typeof msJson[key]).toBe('string');
        expect(typeof enJson[key]).toBe('string');
        expect(msJson[key].trim().length).toBeGreaterThan(0);
        expect(enJson[key].trim().length).toBeGreaterThan(0);
      }
    });

    it('common.json has exact key parity and non-empty strings between ms and en', () => {
      const msJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../locales/ms/common.json'), 'utf-8'));
      const enJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../locales/en/common.json'), 'utf-8'));
      const msKeys = Object.keys(msJson).sort();
      const enKeys = Object.keys(enJson).sort();

      expect(msKeys).toEqual(enKeys);
      for (const key of msKeys) {
        expect(msJson[key].trim().length).toBeGreaterThan(0);
        expect(enJson[key].trim().length).toBeGreaterThan(0);
      }
    });
  });

  describe('2. KebajikanDashboard Localization', () => {
    it('renders Malay greeting, stats, and section headers', () => {
      const html = renderWithI18n(<KebajikanDashboard />, 'ms');
      expect(html).toContain('Berikut adalah ringkasan sistem aduan pelajar hari ini.');
      expect(html).toContain('Tiket Baru');
      expect(html).toContain('Diescalate');
      expect(html).toContain('Kes Selesai');
      expect(html).toContain('Rating Pelajar');
      expect(html).toContain('Trend Aduan Bulanan');
      expect(html).toContain('Diterima vs Diselesaikan — 6 bulan');
      expect(html).toContain('Laporan Penuh');
      expect(html).toContain('Notifikasi');
      expect(html).toContain('Tiada notifikasi baharu');
    });

    it('renders English greeting, stats, and section headers upon language switch', () => {
      const html = renderWithI18n(<KebajikanDashboard />, 'en');
      expect(html).toContain('Here is a summary of the student complaint system today.');
      expect(html).toContain('New Tickets');
      expect(html).toContain('Escalated');
      expect(html).toContain('Resolved Cases');
      expect(html).toContain('Student Rating');
      expect(html).toContain('Monthly Complaint Trends');
      expect(html).toContain('Received vs Resolved — 6 months');
      expect(html).toContain('Full Report');
      expect(html).toContain('Notifications');
      expect(html).toContain('No new notifications');
    });
  });

  describe('3. KebajikanHubPage Localization', () => {
    it('renders Malay executive hub titles, pillars, and action buttons', () => {
      const html = renderWithI18n(<KebajikanHubPage />, 'ms');
      expect(html).toContain('Jawatankuasa Perwakilan Pelajar POLISAS');
      expect(html).toContain('Hab E-Kebajikan &amp; Bantuan Siswa');
      expect(html).toContain('Penyelesaian aduan prasarana kampus dan permohonan pakej bantuan makanan Food Bank JPP secara telus dan pantas.');
      expect(html).toContain('Aduan &amp; Fasiliti Kampus');
      expect(html).toContain('SLA &lt; 24 Jam');
      expect(html).toContain('Hantar Aduan Baharu');
      expect(html).toContain('Aduan Saya');
      expect(html).toContain('Statistik Awam');
      expect(html).toContain('Food Bank JPP');
      expect(html).toContain('Pusat Pengurusan Pegawai &amp; Exco');
      expect(html).toContain('Papan Pemuka Tiket');
      expect(html).toContain('Senarai Tiket Aduan');
      expect(html).toContain('Pusat Kawalan Food Bank');
      expect(html).toContain('Laporan Statistik');
    });

    it('renders English executive hub titles, pillars, and action buttons', () => {
      const html = renderWithI18n(<KebajikanHubPage />, 'en');
      expect(html).toContain('Jawatankuasa Perwakilan Pelajar POLISAS');
      expect(html).toContain('E-Welfare &amp; Student Aid Hub');
      expect(html).toContain('Campus infrastructure complaint resolutions and JPP Food Bank aid package applications transparently and promptly.');
      expect(html).toContain('Campus Complaints &amp; Facilities');
      expect(html).toContain('SLA &lt; 24 Hours');
      expect(html).toContain('Submit New Complaint');
      expect(html).toContain('My Complaints');
      expect(html).toContain('Public Statistics');
      expect(html).toContain('JPP Food Bank');
      expect(html).toContain('Staff &amp; Exco Management Center');
      expect(html).toContain('Ticket Dashboard');
      expect(html).toContain('Complaint Ticket List');
      expect(html).toContain('Food Bank Control Center');
      expect(html).toContain('Statistical Reports');
    });
  });

  describe('4. KebajikanMyTickets Localization', () => {
    it('renders Malay tickets header, empty state and action buttons', () => {
      const html = renderWithI18n(<KebajikanMyTickets />, 'ms');
      expect(html).toContain('Aduan Saya');
      expect(html).toContain('E-Kebajikan');
      expect(html).toContain('Aduan Baru');
      expect(html).toContain('Tiada Aduan Dikemukakan');
      expect(html).toContain('Aduan yang anda kemukakan akan dipaparkan di sini');
      expect(html).toContain('Buat Aduan Pertama');
    });

    it('renders English tickets header, empty state and action buttons', () => {
      const html = renderWithI18n(<KebajikanMyTickets />, 'en');
      expect(html).toContain('My Complaints');
      expect(html).toContain('E-Welfare');
      expect(html).toContain('New Complaint');
      expect(html).toContain('No Complaints Submitted');
      expect(html).toContain('Complaints you submit will appear here');
      expect(html).toContain('Submit First Complaint');
    });

    it('renders active and resolved tickets with localized categories and status tags', () => {
      const sampleTickets: any[] = [
        {
          id: 't-1',
          ticket_no: 'TKT-001',
          title: 'Paip Sinki Rosak',
          description: 'Air melimpah di aras 1.',
          category: 'FASILITI_JABATAN',
          status: 'NEW',
          created_at: new Date().toISOString(),
          resolution_note: null,
          rating: null,
        },
        {
          id: 't-2',
          ticket_no: 'TKT-002',
          title: 'WiFi Blok B Perlahan',
          description: 'Sukar untuk mengakses portal.',
          category: 'WIFI_KAMSIS',
          status: 'RESOLVED',
          created_at: new Date().toISOString(),
          resolution_note: 'Router telah di-restart oleh pihak IT.',
          rating: null,
        },
      ];

      const msHtml = renderWithI18n(<KebajikanMyTickets initialTickets={sampleTickets} initialLoading={false} />, 'ms');
      expect(msHtml).toContain('Fasiliti Jabatan');
      expect(msHtml).toContain('WiFi Kamsis');
      expect(msHtml).toContain('Diterima');
      expect(msHtml).toContain('Selesai');

      const enHtml = renderWithI18n(<KebajikanMyTickets initialTickets={sampleTickets} initialLoading={false} />, 'en');
      expect(enHtml).toContain('Department Facilities');
      expect(enHtml).toContain('Hostel WiFi');
      expect(enHtml).toContain('New');
      expect(enHtml).toContain('Resolved');
    });
  });

  describe('5. KebajikanPublicStats Localization', () => {
    it('renders Malay public statistics hero, metric cards and CTA block', () => {
      const html = renderWithI18n(<KebajikanStatsPage />, 'ms');
      expect(html).toContain('Exco Kebajikan JPP POLISAS');
      expect(html).toContain('Kami Sentiasa');
      expect(html).toContain('Membantu Anda');
      expect(html).toContain('Statistik prestasi pengurusan aduan pelajar oleh Exco Kebajikan JPP POLISAS.');
      expect(html).toContain('Kes Diselesaikan');
      expect(html).toContain('Sejak sistem dilancarkan');
      expect(html).toContain('Kadar Penyelesaian');
      expect(html).toContain('Purata Masa Selesai');
      expect(html).toContain('Kes Aktif Sekarang');
      expect(html).toContain('Ada Masalah? Biar Kami Bantu');
      expect(html).toContain('Buat Aduan Sekarang');
      expect(html).toContain('Aduan Bulanan');
      expect(html).toContain('Pecahan Kategori');
      expect(html).toContain('Penilaian Pelajar');
    });

    it('renders English public statistics hero, metric cards and CTA block', () => {
      const html = renderWithI18n(<KebajikanStatsPage />, 'en');
      expect(html).toContain('Exco Kebajikan JPP POLISAS');
      expect(html).toContain('We Are Always');
      expect(html).toContain('Here to Help You');
      expect(html).toContain('Student complaint management performance statistics by JPP POLISAS Welfare Exco.');
      expect(html).toContain('Resolved Cases');
      expect(html).toContain('Since system launch');
      expect(html).toContain('Resolution Rate');
      expect(html).toContain('Average Resolution Time');
      expect(html).toContain('Active Cases Now');
      expect(html).toContain('Have an Issue? Let Us Help');
      expect(html).toContain('Submit Complaint Now');
      expect(html).toContain('Monthly Complaints');
      expect(html).toContain('Category Breakdown');
      expect(html).toContain('Student Ratings');
    });
  });

  describe('6. KebajikanStaffPage Localization', () => {
    it('renders Malay staff management title, search input, and active staff card', () => {
      const html = renderWithI18n(<KebajikanStaffPage />, 'ms');
      expect(html).toContain('Unit Kebajikan Staff');
      expect(html).toContain('Urus pegawai yang membantu mengendalikan tiket aduan pelajar');
      expect(html).toContain('Tambah Staff Baharu');
      expect(html).toContain('placeholder="Cari nama pengguna..."');
      expect(html).toContain('Cari');
      expect(html).toContain('Senarai Aktif');
      expect(html).toContain('Belum ada Unit Kebajikan Staff ditambah');
    });

    it('renders English staff management title, search input, and active staff card', () => {
      const html = renderWithI18n(<KebajikanStaffPage />, 'en');
      expect(html).toContain('Welfare Unit Staff');
      expect(html).toContain('Manage officers assisting in handling student complaint tickets');
      expect(html).toContain('Add New Staff');
      expect(html).toContain('placeholder="Search user name..."');
      expect(html).toContain('Search');
      expect(html).toContain('Active Staff List');
      expect(html).toContain('No Welfare Unit Staff added yet');
    });

    it('renders assigned staff with localized roles and actions', () => {
      const sampleStaff: any[] = [
        {
          id: 'staff-1',
          staff_user_id: 'user-001',
          role: 'SENIOR_STAFF',
          is_active: true,
          assigned_at: new Date('2026-05-10').toISOString(),
          staff: {
            id: 'user-001',
            full_name: 'Nurul Hidayah',
            email: 'hidayah@polisas.edu.my',
            matric_no: '06DKA24F1001',
          },
          assigner: {
            id: 'user-admin',
            full_name: 'Farhan Azman',
          },
        },
      ];

      const msHtml = renderWithI18n(<KebajikanStaffPage initialStaff={sampleStaff} initialLoading={false} />, 'ms');
      expect(msHtml).toContain('Nurul Hidayah');
      expect(msHtml).toContain('Senior Staff');
      expect(msHtml).toContain('Ditambah');
      expect(msHtml).toContain('oleh Farhan Azman');

      const enHtml = renderWithI18n(<KebajikanStaffPage initialStaff={sampleStaff} initialLoading={false} />, 'en');
      expect(enHtml).toContain('Nurul Hidayah');
      expect(enHtml).toContain('Senior Staff');
      expect(enHtml).toContain('Added');
      expect(enHtml).toContain('by Farhan Azman');
    });
  });

  describe('7. KebajikanStudentChat Localization', () => {
    const mockTicket: any = {
      id: 'ticket-123',
      ticket_no: 'TKT-2026-001',
      title: 'Kerosakan Pili Air Asrama',
      description: 'Pili air di aras 2 rosak dan bocor.',
      category: 'FASILITI_JABATAN',
      status: 'IN_PROGRESS',
      created_at: new Date().toISOString(),
      resolution_note: null,
      rating: null,
    };

    it('renders Malay live chat chrome, divider, and empty message state', () => {
      const html = renderWithI18n(
        <Routes>
          <Route path="/kebajikan/aduan/:id" element={<KebajikanStudentChat initialTicket={mockTicket} initialLoading={false} />} />
        </Routes>,
        'ms'
      );
      expect(html).toContain('Thread Komunikasi');
      expect(html).toContain('Belum ada mesej');
      expect(html).toContain('Hantar mesej di bawah untuk berkomunikasi dengan Exco Kebajikan');
      expect(html).toContain('placeholder="Tulis mesej kepada Exco Kebajikan..."');
      expect(html).toContain('Enter untuk hantar · Shift+Enter untuk baris baru');
    });

    it('renders English live chat chrome, divider, and empty message state', () => {
      const html = renderWithI18n(
        <Routes>
          <Route path="/kebajikan/aduan/:id" element={<KebajikanStudentChat initialTicket={mockTicket} initialLoading={false} />} />
        </Routes>,
        'en'
      );
      expect(html).toContain('Communication Thread');
      expect(html).toContain('No messages yet');
      expect(html).toContain('Send a message below to communicate directly with Welfare Exco');
      expect(html).toContain('placeholder="Write a message to Welfare Exco..."');
      expect(html).toContain('Press Enter to send · Shift+Enter for new line');
    });

    it('renders resolved ticket with resolution note, reopen and rating buttons localized', () => {
      const resolvedTicket: any = {
        id: 'ticket-999',
        ticket_no: 'TKT-2026-999',
        title: 'Lampu Koridor Rosak',
        description: 'Lampu malap di koridor.',
        category: 'FASILITI_SUKAN',
        status: 'RESOLVED',
        created_at: new Date().toISOString(),
        resolution_note: 'Lampu telah diganti baru oleh pihak juruteknik.',
        rating: null,
      };

      const msHtml = renderWithI18n(
        <Routes>
          <Route path="/kebajikan/aduan/:id" element={<KebajikanStudentChat initialTicket={resolvedTicket} initialLoading={false} />} />
        </Routes>,
        'ms'
      );
      expect(msHtml).toContain('Nota Resolusi Exco');
      expect(msHtml).toContain('Lampu telah diganti baru oleh pihak juruteknik.');
      expect(msHtml).toContain('Beri Penilaian');
      expect(msHtml).toContain('Buka Semula');
      expect(msHtml).toContain('Aduan ini telah diselesaikan');

      const enHtml = renderWithI18n(
        <Routes>
          <Route path="/kebajikan/aduan/:id" element={<KebajikanStudentChat initialTicket={resolvedTicket} initialLoading={false} />} />
        </Routes>,
        'en'
      );
      expect(enHtml).toContain('Exco Resolution Note');
      expect(enHtml).toContain('Lampu telah diganti baru oleh pihak juruteknik.');
      expect(enHtml).toContain('Rate Service');
      expect(enHtml).toContain('Reopen');
      expect(enHtml).toContain('This complaint has been resolved');
    });
  });

  describe('8. KebajikanPlaceholders & LiveTrackerCard Localization', () => {
    it('renders KebajikanEmptyState localized in Malay and English', () => {
      const msHtml = renderWithI18n(<KebajikanEmptyState />, 'ms');
      expect(msHtml).toContain('Tiada Aduan Dikemukakan');
      expect(msHtml).toContain('Aduan yang anda kemukakan akan dipaparkan di sini');

      const enHtml = renderWithI18n(<KebajikanEmptyState />, 'en');
      expect(enHtml).toContain('No Complaints Submitted');
      expect(enHtml).toContain('Complaints you submit will appear here');
    });

    it('renders KebajikanLiveTrackerCard with active ticket and foodbank app', () => {
      const sampleTicket = {
        id: 't-1',
        ticket_no: 'TKT-999',
        title: 'Lampu Bilik Rosak',
        status: 'NEW',
      };
      const sampleFoodbank = {
        id: 'fb-1',
        application_no: 'FB-001',
        status: 'DALAM_SEMAKAN',
        location: { name: 'Kaunter JHEP' },
        pickup_time_slot: '10:00 AM - 11:30 AM',
      };

      const msHtml = renderWithI18n(
        <KebajikanLiveTrackerCard ticket={sampleTicket} foodbankApp={sampleFoodbank} />,
        'ms'
      );
      expect(msHtml).toContain('Penjejak Aduan Langsung');
      expect(msHtml).toContain('Aduan Fasiliti: Lampu Bilik Rosak');
      expect(msHtml).toContain('No. Rujukan: ');
      expect(msHtml).toContain('SLA: 24-48 Jam Bekerja');
      expect(msHtml).toContain('Dihantar');
      expect(msHtml).toContain('Disemak JPP');
      expect(msHtml).toContain('Buka Chat Aduan');

      const enHtml = renderWithI18n(
        <KebajikanLiveTrackerCard ticket={sampleTicket} foodbankApp={sampleFoodbank} />,
        'en'
      );
      expect(enHtml).toContain('Live Complaint Tracker');
      expect(enHtml).toContain('Facility Complaint: Lampu Bilik Rosak');
      expect(enHtml).toContain('Ref No: ');
      expect(enHtml).toContain('SLA: 24-48 Business Hours');
      expect(enHtml).toContain('Submitted');
      expect(enHtml).toContain('Reviewed by JPP');
      expect(enHtml).toContain('Open Ticket Chat');
    });
  });
});
