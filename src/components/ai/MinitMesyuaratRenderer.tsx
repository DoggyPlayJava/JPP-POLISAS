/**
 * MinitMesyuaratRenderer.tsx
 *
 * Komponen React yang merender Minit Mesyuarat Rasmi JPP POLISAS
 * daripada data JSON berstruktur — meniru format tepat dokumen PDF rujukan.
 *
 * Format: Times New Roman, border luar, jadual kehadiran 2-kolum,
 *         jadual agenda 3-kolum, blok tandatangan 2-kolum.
 */

import React from 'react';

// ─── TYPE DEFINITIONS ────────────────────────────────────────────────────────

export interface AhliHadir {
  bil: number;
  nama: string;
  jawatan?: string;
}

export interface SubPerkara {
  bil_sub: string;          // e.g. "1.1", "1.2"
  teks: string;
  bullet_points?: string[]; // optional sub-bullets under this sub-perkara
}

export interface AgendaItem {
  bil: number;
  tajuk: string;
  sub_perkara?: SubPerkara[];
  tindakan?: string;
}

export interface TandatanganPihak {
  nama: string;
  jawatan: string;  // multi-line supported via \n
}

export interface MinitMesyuaratData {
  tajuk_mesyuarat: string;           // e.g. "MESYUARAT KHAS KALI KE-1 KELAB DAN PERSATUAN"
  tarikh: string;                    // e.g. "08/04/2026"
  masa: string;                      // e.g. "05.15 Petang"
  platform: string;                  // e.g. "Student Centre"
  kehadiran: number;
  ahli_hadir: AhliHadir[];
  agenda: AgendaItem[];
  tandatangan: {
    disediakan_oleh: TandatanganPihak;
    disahkan_oleh: TandatanganPihak;
  };
}

// ─── STYLE CONSTANTS (theme-aware using CSS variables) ───────────────────────

const DOC_FONT = 'Times New Roman, Times, serif';
const DOC_SIZE = '10.5pt';

// Border color follows theme via CSS variable
const CELL_BORDER = '1px solid currentColor';

const tdBase: React.CSSProperties = {
  border: CELL_BORDER,
  padding: '4px 8px',
  verticalAlign: 'top',
  fontSize: DOC_SIZE,
  fontFamily: DOC_FONT,
  opacity: 1,
};

const tdCenter: React.CSSProperties = { ...tdBase, textAlign: 'center' };
const tdBold: React.CSSProperties = { ...tdBase, fontWeight: 'bold' };

// ─── SUB-COMPONENTS ──────────────────────────────────────────────────────────

/** HEADER SECTION — Tajuk + Metadata */
function HeaderSection({ data }: { data: MinitMesyuaratData }) {
  return (
    <div style={{ fontSize: DOC_SIZE, fontFamily: DOC_FONT, lineHeight: 1.5 }}>
      {/* Document Title */}
      <div style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: 2 }}>
        MINIT MESYUARAT
      </div>
      <div style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: 16 }}>
        {data.tajuk_mesyuarat.toUpperCase()}
      </div>

      {/* BIL field — left blank per format, SU fills manually */}
      <div style={{ marginBottom: 10 }}>
        <strong>BIL:</strong>
      </div>

      {/* Metadata rows */}
      <table style={{ borderCollapse: 'collapse', marginBottom: 10 }}>
        <tbody>
          <tr>
            <td style={{ fontFamily: DOC_FONT, fontSize: DOC_SIZE, paddingRight: 4, fontWeight: 'bold', whiteSpace: 'nowrap' }}>TARIKH</td>
            <td style={{ fontFamily: DOC_FONT, fontSize: DOC_SIZE, paddingRight: 8 }}>:</td>
            <td style={{ fontFamily: DOC_FONT, fontSize: DOC_SIZE }}>{data.tarikh}</td>
          </tr>
          <tr>
            <td style={{ fontFamily: DOC_FONT, fontSize: DOC_SIZE, paddingRight: 4, fontWeight: 'bold', whiteSpace: 'nowrap' }}>MASA</td>
            <td style={{ fontFamily: DOC_FONT, fontSize: DOC_SIZE, paddingRight: 8 }}>:</td>
            <td style={{ fontFamily: DOC_FONT, fontSize: DOC_SIZE }}>{data.masa}</td>
          </tr>
          <tr>
            <td style={{ fontFamily: DOC_FONT, fontSize: DOC_SIZE, paddingRight: 4, fontWeight: 'bold', whiteSpace: 'nowrap' }}>PLATFORM</td>
            <td style={{ fontFamily: DOC_FONT, fontSize: DOC_SIZE, paddingRight: 8 }}>:</td>
            <td style={{ fontFamily: DOC_FONT, fontSize: DOC_SIZE }}>{data.platform}</td>
          </tr>
        </tbody>
      </table>

      {/* Kehadiran count */}
      <div style={{ marginBottom: 12 }}>
        <strong style={{ fontFamily: DOC_FONT, fontSize: DOC_SIZE }}>KEHADIRAN :</strong>
        <span style={{ fontFamily: DOC_FONT, fontSize: DOC_SIZE }}> {data.kehadiran} Orang</span>
      </div>
    </div>
  );
}

/** JADUAL KEHADIRAN — 2-column: BIL | NAMA */
function JadualKehadiran({ ahliHadir }: { ahliHadir: AhliHadir[] }) {
  return (
    <div style={{ marginTop: 8 }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: DOC_SIZE, fontFamily: DOC_FONT }}>
        <thead>
          <tr>
            <td style={{ ...tdBold, textAlign: 'center', width: '12%' }}>BIL</td>
            <td style={{ ...tdBold, textAlign: 'center' }}>NAMA</td>
          </tr>
        </thead>
        <tbody>
          {ahliHadir.map((ahli) => (
            <tr key={ahli.bil}>
              <td style={tdCenter}>{ahli.bil}</td>
              <td style={tdBase}>
                {ahli.nama}
                {ahli.jawatan && (
                  <span className="opacity-60 text-[9pt]"> — {ahli.jawatan}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** JADUAL AGENDA — 3-column: BIL. | AGENDA | TINDAKAN */
function JadualAgenda({ agenda }: { agenda: AgendaItem[] }) {
  return (
    <div>
      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: DOC_SIZE, fontFamily: DOC_FONT }}>
        <thead>
          <tr>
            <td style={{ ...tdBold, textAlign: 'center', width: '8%' }}>BIL.</td>
            <td style={{ ...tdBold, textAlign: 'center' }}>AGENDA</td>
            <td style={{ ...tdBold, textAlign: 'center', width: '16%' }}>TINDAKAN</td>
          </tr>
        </thead>
        <tbody>
          {agenda.map((item) => (
            <tr key={item.bil}>
              {/* BIL column */}
              <td style={{ ...tdBase, textAlign: 'center', verticalAlign: 'top' }}>{item.bil}</td>

              {/* AGENDA content column */}
              <td style={{ ...tdBase, verticalAlign: 'top', lineHeight: 1.6 }}>
                {/* Main tajuk */}
                <div style={{ fontWeight: 'bold', marginBottom: item.sub_perkara?.length ? 6 : 0 }}>
                  {item.tajuk}
                </div>

                {/* Sub-perkara */}
                {item.sub_perkara?.map((sub) => (
                  <div key={sub.bil_sub} style={{ marginBottom: 4 }}>
                    <span style={{ marginRight: 6 }}>{sub.bil_sub}</span>
                    <span>{sub.teks}</span>

                    {/* Bullet points under sub-perkara */}
                    {sub.bullet_points && sub.bullet_points.length > 0 && (
                      <ul style={{ margin: '4px 0 4px 20px', padding: 0, listStyleType: 'none' }}>
                        {sub.bullet_points.map((bp, bIdx) => {
                          // Selamat: Parse '*teks*' kepada <em><strong>teks</strong></em> tanpa bahaya XSS
                          const parts = bp.split(/(\*.*?\*)/g);
                          return (
                            <li key={bIdx} style={{ marginBottom: 2 }}>
                              <span style={{ marginRight: 6 }}>-</span>
                              <span>
                                {parts.map((part, pIdx) => {
                                  if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
                                    return <em key={pIdx}><strong>{part.slice(1, -1)}</strong></em>;
                                  }
                                  return <React.Fragment key={pIdx}>{part}</React.Fragment>;
                                })}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                ))}
              </td>

              {/* TINDAKAN column */}
              <td style={{ ...tdBase, textAlign: 'center', verticalAlign: 'top' }}>
                {item.tindakan || ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** BLOK TANDATANGAN — 2-column: Disediakan oleh | Disahkan oleh */
function BlokTandatangan({ tandatangan }: { tandatangan: MinitMesyuaratData['tandatangan'] }) {
  const renderPihak = (label: string, pihak: TandatanganPihak) => (
    <div style={{ flex: 1, fontSize: DOC_SIZE, fontFamily: DOC_FONT, lineHeight: 1.6 }}>
      <div style={{ marginBottom: 4 }}>{label}</div>
      {/* Signature space */}
      <div style={{ height: 64 }} />
      {/* Signature line — uses currentColor to follow theme */}
      <div style={{ borderTop: '1px solid currentColor', paddingTop: 4 }}>
        <div style={{ fontWeight: 'bold' }}>{pihak.nama}</div>
        {pihak.jawatan.split('\n').map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ marginTop: 32, display: 'flex', gap: 48 }}>
      {renderPihak('Disediakan oleh:', tandatangan.disediakan_oleh)}
      {renderPihak('Disahkan oleh:', tandatangan.disahkan_oleh)}
    </div>
  );
}

/** PAGE BREAK — visual separator between sections */
function PageBreak() {
  return (
    <div className="my-10 relative flex items-center justify-center pointer-events-none select-none">
      <div className="absolute inset-x-0 h-px bg-border/60" />
      <span className="relative px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/70 bg-card border border-border/50 rounded-full shadow-sm">
        MUKA SURAT BARU
      </span>
    </div>
  );
}

/** DOCUMENT FOOTER — branded closing */
function DocumentFooter() {
  return (
    <div className="mt-10 flex flex-col items-center gap-6 pointer-events-none select-none border-t border-dashed border-border/30 pt-8">
      <div className="px-8 py-2.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 backdrop-blur-sm flex items-center gap-3 shadow-sm">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-[11px] font-black uppercase tracking-[0.4em] text-emerald-500/80">
          Tamat Dokumen
        </span>
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
      </div>
      <div className="flex flex-col items-center gap-2 opacity-30 grayscale hover:grayscale-0 transition-all">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-emerald-500 flex items-center justify-center">
            <span className="text-[10px] text-white font-bold">N</span>
          </div>
          <span className="text-xs font-black tracking-tighter text-foreground">NEXUS AI</span>
        </div>
        <p className="text-[9px] font-medium text-muted-foreground italic">Generated officially by Nexus AI Hub</p>
      </div>
    </div>
  );
}

// ─── OUTER BORDER WRAPPER ────────────────────────────────────────────────────

/** Wraps content in a single-line border that adapts to current theme */
function OuterBorderWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="border border-foreground/30 dark:border-foreground/20 rounded-sm p-6 bg-card text-card-foreground" style={{
      fontFamily: DOC_FONT,
      lineHeight: 1.5,
    }}>
      {children}
    </div>
  );
}

// ─── MAIN EXPORT ─────────────────────────────────────────────────────────────

interface MinitMesyuaratRendererProps {
  data: MinitMesyuaratData;
}

export function MinitMesyuaratRenderer({ data }: MinitMesyuaratRendererProps) {
  if (!data) return null;

  return (
    <div className="text-foreground" style={{ fontFamily: DOC_FONT, fontSize: DOC_SIZE, lineHeight: 1.5 }}>

      {/* ── HALAMAN 1: HEADER + KEHADIRAN ── */}
      <OuterBorderWrapper>
        <HeaderSection data={data} />
        <JadualKehadiran ahliHadir={data.ahli_hadir} />
      </OuterBorderWrapper>

      <PageBreak />

      {/* ── HALAMAN 2+: JADUAL AGENDA ── */}
      <OuterBorderWrapper>
        <JadualAgenda agenda={data.agenda} />
      </OuterBorderWrapper>

      <PageBreak />

      {/* ── HALAMAN AKHIR: TANDATANGAN ── */}
      <OuterBorderWrapper>
        <BlokTandatangan tandatangan={data.tandatangan} />
      </OuterBorderWrapper>

      {/* ── PENUTUP ESTETIK ── */}
      <DocumentFooter />
    </div>
  );
}
