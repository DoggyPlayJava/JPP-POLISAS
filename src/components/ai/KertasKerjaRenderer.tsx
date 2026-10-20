/**
 * KertasKerjaRenderer.tsx
 *
 * Komponen ini bertanggungjawab SEPENUHNYA untuk merender Kertas Kerja Rasmi
 * JPP POLISAS daripada data JSON berstruktur. AI hanya menjana data (JSON),
 * manakala komponen ini mengendalikan semua pembentangan (UI) dan pengiraan matematik.
 *
 * Prinsip: Separation of Concerns — AI ≠ HTML/CSS/Math
 */

import React from 'react';
import { useTranslation } from 'react-i18next';

// ─── TYPE DEFINITIONS ───────────────────────────────────────────────────────

export interface BelanjawanItem {
  perkara: string;
  harga_seunit: number;
  kuantiti: number;
  unit: string;
}

export interface BelanjawanKategori {
  nama_kategori: string;
  items: BelanjawanItem[];
}

export interface TentatifSlot {
  masa_mula: string;
  masa_tamat: string;
  aktiviti: string;
}

export interface TentatifHari {
  tarikh: string;
  hari: string;
  slot: TentatifSlot[];
}

export interface UnitPelaksana {
  nama_unit: string;
  ahli: string[];
}

export interface JawatankuasaInduk {
  penaung: { nama: string; jawatan: string };
  penasihat: { nama: string; jawatan: string }[];
  pengerusi: { nama: string; jawatan: string };
}

export interface KertasKerjaData {
  halaman_muka: {
    tajuk_program: string;
    tarikh: string;
    hari: string;
    tempat: string;
    penganjur: string;
  };
  ringkasan_eksekutif: {
    jenis_program: string;
    matlamat: string[];
    bilangan_peserta: number;
    bilangan_pegawai: number;
    anggaran_kos: number;
  };
  isi_kandungan: {
    pendahuluan: string;
    nama_program: string;
    tujuan: string;
    matlamat: string[];
    bentuk_program: string;
  };
  carta_organisasi: {
    jawatankuasa_induk: JawatankuasaInduk;
    jawatankuasa_majlis_tertinggi: { nama: string; jawatan: string }[];
    unit_pelaksana: UnitPelaksana[];
  };
  tentatif: TentatifHari[];
  belanjawan: {
    kategori: BelanjawanKategori[];
    pendapatan: { sumber: string; jumlah: number }[];
  };
  tandatangan: {
    pengarah_program: string;
    penasihat_jpp: string;
    ketua_jabatan_hep: string;
    timbalan_pengarah: string;
  };
}

// ─── HELPER FUNCTIONS ────────────────────────────────────────────────────────

/** Format nilai sebagai RM dengan 2 tempat perpuluhan */
function formatRM(value: number): string {
  return `RM ${value.toFixed(2)}`;
}

/** Kira subtotal kategori — React bertanggungjawab 100% untuk matematik ini */
function hitungSubtotal(items: BelanjawanItem[]): number {
  return items.reduce((sum, item) => sum + item.harga_seunit * item.kuantiti, 0);
}

/** Kira jumlah keseluruhan belanjawan */
function hitungJumlahKeseluruhan(kategori: BelanjawanKategori[]): number {
  return kategori.reduce((sum, kat) => sum + hitungSubtotal(kat.items), 0);
}

// ─── STYLE CONSTANTS (format rasmi) ──────────────────────────────────────────

const tdBase: React.CSSProperties = {
  border: '1px solid currentColor',
  opacity: 0.8,
  padding: '6px 8px',
  verticalAlign: 'top',
};

const tdCenter: React.CSSProperties = { ...tdBase, textAlign: 'center' };
const tdRight: React.CSSProperties = { ...tdBase, textAlign: 'right' };
const tdBold: React.CSSProperties = { ...tdBase, fontWeight: 'bold' };

// ─── SUB-COMPONENTS ──────────────────────────────────────────────────────────

/** HALAMAN MUKA */
function HalamanMuka({ data }: { data: KertasKerjaData['halaman_muka'] }) {
  const { t } = useTranslation(['kpp', 'common']);
  return (
    <div style={{ textAlign: 'center', lineHeight: 2 }}>
      <div style={{ fontWeight: 'bold', fontSize: '13pt' }}>{t('kpp:doc_working_paper', 'KERTAS KERJA')}</div>
      <div style={{ fontWeight: 'bold', fontSize: '13pt' }}>{data.tajuk_program}</div>
      <br />
      <div style={{ fontWeight: 'bold' }}>{data.tarikh} ({data.hari})</div>
      <div style={{ fontWeight: 'bold' }}>{data.tempat}</div>
      <br />
      <div style={{ fontWeight: 'bold' }}>{t('kpp:doc_organized_by', 'ANJURAN:')}</div>
      <div style={{ fontWeight: 'bold' }}>{data.penganjur}</div>
      <div style={{ fontWeight: 'bold' }}>POLITEKNIK SULTAN HAJI AHMAD SHAH</div>
    </div>
  );
}

/** RINGKASAN EKSEKUTIF */
function RingkasanEksekutif({
  data,
  halaman,
}: {
  data: KertasKerjaData['ringkasan_eksekutif'];
  halaman: KertasKerjaData['halaman_muka'];
}) {
  const { t } = useTranslation(['kpp', 'common']);
  return (
    <>
      <div style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: 12 }}>
        {t('kpp:doc_executive_summary', 'RINGKASAN EKSEKUTIF')}
        <br />
        {halaman.tajuk_program}
      </div>
      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '10pt' }}>
        <tbody>
          <tr>
            <td style={{ ...tdBase, width: '35%', fontWeight: 'bold' }}>{t('kpp:doc_ipta', 'IPTA')}</td>
            <td style={tdBase}>Politeknik Sultan Haji Ahmad Shah</td>
          </tr>
          <tr>
            <td style={tdBold}>{t('kpp:doc_program_title', 'TAJUK PROGRAM')}</td>
            <td style={tdBase}>{halaman.tajuk_program}</td>
          </tr>
          <tr>
            <td style={tdBold}>{t('kpp:doc_program_type', 'JENIS PROGRAM')}</td>
            <td style={tdBase}>{data.jenis_program}</td>
          </tr>
          <tr>
            <td style={tdBold}>{t('kpp:doc_program_goals', 'MATLAMAT/PENCAPAIAN PROGRAM')}</td>
            <td style={tdBase}>
              <ol style={{ margin: 0, paddingLeft: 18 }}>
                {data.matlamat.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ol>
            </td>
          </tr>
          <tr>
            <td style={tdBold}>{t('kpp:doc_organizer', 'ANJURAN')}</td>
            <td style={tdBase}>{halaman.penganjur} {t('kpp:doc_in_collaboration_with_jhep', 'dengan kerjasama Jabatan Hal Ehwal Pelajar POLISAS')}</td>
          </tr>
          <tr>
            <td style={tdBold}>{t('kpp:doc_date_and_venue', 'TARIKH DAN TEMPAT')}</td>
            <td style={tdBase}>{halaman.tarikh}, {halaman.tempat}</td>
          </tr>
          <tr>
            <td style={tdBold}>{t('kpp:doc_total_participants', 'BILANGAN PESERTA')}</td>
            <td style={tdBase}>
              {t('kpp:doc_participants_count', 'Peserta: {{count}} orang', { count: data.bilangan_peserta })}
              <br />
              {t('kpp:doc_officers_count', 'Pegawai: {{count}} orang', { count: data.bilangan_pegawai })}
            </td>
          </tr>
          <tr>
            <td style={tdBold}>{t('kpp:doc_estimated_cost', 'ANGGARAN KOS')}</td>
            <td style={tdBase}>{formatRM(data.anggaran_kos)}</td>
          </tr>
        </tbody>
      </table>
    </>
  );
}

/** ISI KANDUNGAN (Bahagian 1.0 - 12.0) */
function IsiKandungan({
  data,
  halaman,
  ringkasan,
  tandatangan,
}: {
  data: KertasKerjaData['isi_kandungan'];
  halaman: KertasKerjaData['halaman_muka'];
  ringkasan: KertasKerjaData['ringkasan_eksekutif'];
  tandatangan: KertasKerjaData['tandatangan'];
}) {
  const { t } = useTranslation(['kpp', 'common']);
  return (
    <div style={{ lineHeight: 1.8, fontSize: '11pt' }}>
      <p><strong>{t('kpp:doc_sec_introduction', '1.0 PENDAHULUAN')}</strong></p>
      <p style={{ textAlign: 'justify' }}>{data.pendahuluan}</p>

      <p><strong>{t('kpp:doc_sec_program_name', '2.0 NAMA PROGRAM')}</strong></p>
      <p>{data.nama_program}</p>

      <p><strong>{t('kpp:doc_sec_purpose', '3.0 TUJUAN')}</strong></p>
      <p>{data.tujuan}</p>

      <p><strong>{t('kpp:doc_sec_goals', '4.0 MATLAMAT')}</strong></p>
      <ol>
        {data.matlamat.map((m, i) => (
          <li key={i}>{m}</li>
        ))}
      </ol>

      <p><strong>{t('kpp:doc_sec_organizer', '5.0 PENGANJUR')}</strong></p>
      <p>{halaman.penganjur} {t('kpp:doc_in_collaboration_jhep_full', 'dengan kerjasama Jabatan Hal Ehwal Pelajar (JHEP) POLISAS.')}</p>

      <p><strong>{t('kpp:doc_sec_date_time_venue', '6.0 TARIKH, MASA DAN TEMPAT')}</strong></p>
      <p>
        {t('kpp:doc_label_date', 'Tarikh')}&nbsp;&nbsp;&nbsp;&nbsp;: {halaman.tarikh}<br />
        {t('kpp:doc_label_time', 'Masa')}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: {t('kpp:doc_default_time_range', '8:00 Pagi - 5:00 Petang')}<br />
        {t('kpp:doc_label_venue', 'Tempat')}&nbsp;&nbsp;&nbsp;: {halaman.tempat}
      </p>

      <p><strong>{t('kpp:doc_sec_target_audience', '7.0 PENYERTAAN / SASARAN')}</strong></p>
      <p>{t('kpp:doc_participants_target', '{{count}} orang peserta.', { count: ringkasan.bilangan_peserta })}</p>

      <p><strong>{t('kpp:doc_sec_program_format', '8.0 BENTUK PROGRAM')}</strong></p>
      <p>{data.bentuk_program}</p>

      <p><strong>{t('kpp:doc_sec_org_chart', '9.0 CARTA ORGANISASI')}</strong></p>
      <p>{t('kpp:doc_refer_appendix_1', 'Rujuk Lampiran I.')}</p>

      <p><strong>{t('kpp:doc_sec_tentative', '10.0 TENTATIF PROGRAM')}</strong></p>
      <p>{t('kpp:doc_refer_appendix_2', 'Rujuk Lampiran II.')}</p>

      <p><strong>{t('kpp:doc_sec_budget', '11.0 ANGGARAN BELANJAWAN')}</strong></p>
      <p>{t('kpp:doc_refer_appendix_3', 'Rujuk Lampiran III.')}</p>

      <p><strong>{t('kpp:doc_sec_closing', '12.0 PENUTUP')}</strong></p>
      <p style={{ textAlign: 'justify' }}>
        {t('kpp:doc_closing_body', 'Berdasarkan kertas kerja ini, maka dipohon agar pihak pengurusan POLISAS dapat memberi komitmen dan sokongan bagi menjayakan program ini. Semoga yang dirancang ini dapat berjalan dengan lancar dan memenuhi matlamat dan objektif program serta memberi manfaat kepada semua siswa/siswi Politeknik Sultan Haji Ahmad Shah.')}
      </p>

      {/* Blok Tandatangan */}
      <div style={{ pageBreakInside: 'avoid' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 24 }}>
          <tbody>
            <tr>
              <td style={{ width: '50%', verticalAlign: 'top', paddingRight: 24 }}>
                {t('kpp:doc_prepared_by', 'Disediakan oleh:')}
                <br /><br /><br />
                _____________________<br />
                <strong>{tandatangan.pengarah_program}</strong><br />
                {t('kpp:doc_program_director', 'Pengarah Program')}<br />
                {halaman.tajuk_program}
              </td>
              <td style={{ width: '50%', verticalAlign: 'top', paddingLeft: 24 }}>
                {t('kpp:doc_reviewed_by', 'Disemak oleh:')}
                <br /><br /><br />
                _____________________<br />
                <strong>{tandatangan.penasihat_jpp}</strong><br />
                {t('kpp:doc_advisor', 'Penasihat')}<br />
                {t('kpp:doc_jpp_title', 'Jawatankuasa Perwakilan Pelajar')}<br />
                Politeknik Sultan Haji Ahmad Shah
              </td>
            </tr>
            <tr>
              <td style={{ verticalAlign: 'top', paddingRight: 24, paddingTop: 32 }}>
                {t('kpp:doc_supported_by', 'Disokong oleh:')}
                <br /><br /><br />
                _____________________<br />
                <strong>{tandatangan.ketua_jabatan_hep}</strong><br />
                {t('kpp:doc_head_of_department', 'Ketua Jabatan')}<br />
                {t('kpp:doc_student_affairs', 'Hal Ehwal Pelajar')}<br />
                Politeknik Sultan Haji Ahmad Shah
              </td>
              <td style={{ verticalAlign: 'top', paddingLeft: 24, paddingTop: 32 }}>
                {t('kpp:doc_approved_by', 'Diluluskan oleh:')}
                <br /><br /><br />
                _____________________<br />
                <strong>{tandatangan.timbalan_pengarah}</strong><br />
                {t('kpp:doc_deputy_director', 'Timbalan Pengarah (Sokongan Akademik)')}<br />
                Politeknik Sultan Haji Ahmad Shah
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** LAMPIRAN I — CARTA ORGANISASI */
function LampiranI({ data }: { data: KertasKerjaData['carta_organisasi']; tajuk: string }) {
  const { t } = useTranslation(['kpp', 'common']);
  const { jawatankuasa_induk: jki, jawatankuasa_majlis_tertinggi: jmt, unit_pelaksana: up } = data;

  return (
    <div style={{ textAlign: 'center', lineHeight: 2 }}>
      <div style={{ fontStyle: 'italic', fontWeight: 'bold' }}>{t('kpp:doc_appendix_1', 'LAMPIRAN I')}</div>
      <div style={{ fontWeight: 'bold' }}>{t('kpp:doc_comm_committee_members', 'AHLI JAWATANKUASA PELAKSANA')}</div>
      <br />

      <div style={{ textDecoration: 'underline', fontWeight: 'bold' }}>{t('kpp:doc_comm_main', 'JAWATANKUASA INDUK')}</div>
      <br />

      <div style={{ fontWeight: 'bold' }}>{t('kpp:doc_comm_patron', 'PENAUNG')}</div>
      <div style={{ fontWeight: 'bold' }}>{jki.penaung.nama}</div>
      <div>{jki.penaung.jawatan}</div>
      <br />

      <div style={{ fontWeight: 'bold' }}>{t('kpp:doc_comm_advisor', 'PENASIHAT')}</div>
      {jki.penasihat.map((p, i) => (
        <div key={i}>
          <div style={{ fontWeight: 'bold' }}>{p.nama}</div>
          <div>{p.jawatan}</div>
          <br />
        </div>
      ))}

      <div style={{ fontWeight: 'bold' }}>{t('kpp:doc_comm_chairperson', 'PENGERUSI')}</div>
      <div style={{ fontWeight: 'bold' }}>{jki.pengerusi.nama}</div>
      <div>{jki.pengerusi.jawatan}</div>
      <br /><br />

      <div style={{ textDecoration: 'underline', fontWeight: 'bold' }}>{t('kpp:doc_comm_high_council', 'JAWATANKUASA MAJLIS TERTINGGI')}</div>
      <br />
      {jmt.map((j, i) => (
        <div key={i}>
          <div style={{ fontWeight: 'bold' }}>{j.nama}</div>
          <div>{j.jawatan}</div>
          <br />
        </div>
      ))}

      {/* PAGE BREAK sebelum Unit Pelaksana */}
      <div style={{ pageBreakBefore: 'always', paddingTop: 16 }}>
        <div style={{ textDecoration: 'underline', fontWeight: 'bold' }}>{t('kpp:doc_comm_unit_exec', 'JAWATANKUASA PELAKSANA UNIT')}</div>
        <br />
        {up.map((unit, i) => (
          <div key={i}>
            <div>{unit.nama_unit}</div>
            {unit.ahli.map((nama, j) => (
              <div key={j} style={{ fontWeight: 'bold' }}>{nama}</div>
            ))}
            <br />
          </div>
        ))}
      </div>
    </div>
  );
}

/** LAMPIRAN II — TENTATIF PROGRAM */
function LampiranII({ data, tajuk }: { data: TentatifHari[]; tajuk: string }) {
  const { t } = useTranslation(['kpp', 'common']);
  return (
    <div>
      <div style={{ textAlign: 'center', fontStyle: 'italic', fontWeight: 'bold' }}>{t('kpp:doc_appendix_2', 'LAMPIRAN II')}</div>
      <div style={{ textAlign: 'center', fontWeight: 'bold' }}>{t('kpp:doc_tentative_header', 'TENTATIF PROGRAM')}</div>
      <div style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: 16 }}>{tajuk}</div>

      {data.map((hari, idx) => (
        <div key={idx} style={{ marginBottom: 24 }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '10pt' }}>
            <tbody>
              {/* Header baris hari */}
              <tr>
                <td
                  colSpan={2}
                  style={{
                    ...tdBase,
                    fontWeight: 'bold',
                    textAlign: 'center',
                    backgroundColor: 'rgba(var(--muted), 0.3)',
                    color: 'inherit',
                  }}
                >
                  {hari.tarikh} ({hari.hari})
                </td>
              </tr>
              {/* Sub-header MASA / AKTIVITI */}
              <tr>
                <td style={{ ...tdBold, textAlign: 'center', width: '30%' }}>{t('kpp:doc_th_time', 'MASA')}</td>
                <td style={{ ...tdBold, textAlign: 'center' }}>{t('kpp:doc_th_activity', 'AKTIVITI')}</td>
              </tr>
              {/* Slot aktiviti — React loop, tiada risiko HTML rosak */}
              {hari.slot.map((slot, j) => (
                <tr key={j}>
                  <td style={{ ...tdBase, textAlign: 'center', whiteSpace: 'nowrap' }}>
                    {slot.masa_mula} - {slot.masa_tamat}
                  </td>
                  <td style={tdBase}>{slot.aktiviti}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

/** LAMPIRAN III — ANGGARAN PERBELANJAAN */
function LampiranIII({
  data,
  tajuk,
}: {
  data: KertasKerjaData['belanjawan'];
  tajuk: string;
}) {
  const { t } = useTranslation(['kpp', 'common']);
  const jumlahKeseluruhan = hitungJumlahKeseluruhan(data.kategori);

  return (
    <div>
      <div style={{ textAlign: 'center', fontStyle: 'italic', fontWeight: 'bold' }}>{t('kpp:doc_appendix_3', 'LAMPIRAN III')}</div>
      <div style={{ textAlign: 'center', fontWeight: 'bold' }}>{t('kpp:doc_budget_header', 'ANGGARAN PERBELANJAAN')}</div>
      <div style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: 16 }}>{tajuk}</div>

      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '10pt' }}>
        <thead>
          <tr>
            <td style={{ ...tdBold, textAlign: 'center', width: '8%' }}>{t('kpp:doc_th_no', 'BIL')}</td>
            <td style={{ ...tdBold, textAlign: 'center' }}>{t('kpp:doc_th_item', 'PERKARA')}</td>
            <td style={{ ...tdBold, textAlign: 'center', width: '16%' }}>{t('kpp:doc_th_unit_price', 'HARGA SEUNIT')}</td>
            <td style={{ ...tdBold, textAlign: 'center', width: '14%' }}>{t('kpp:doc_th_qty', 'KUANTITI')}</td>
            <td style={{ ...tdBold, textAlign: 'center', width: '17%' }}>{t('kpp:doc_th_total', 'JUMLAH')}</td>
          </tr>
        </thead>
        <tbody>
          {data.kategori.map((kat, katIdx) => {
            const subtotal = hitungSubtotal(kat.items); // ← React kira, bukan AI
            return (
              <React.Fragment key={katIdx}>
                {/* Baris Header Kategori */}
                <tr>
                  <td style={tdBold}>{katIdx + 1}.</td>
                  <td style={{ ...tdBold }} colSpan={4}>
                    {kat.nama_kategori}
                  </td>
                </tr>

                {/* Baris Item */}
                {kat.items.map((item, itemIdx) => {
                  const jumlahItem = item.harga_seunit * item.kuantiti; // ← React kira
                  return (
                    <tr key={itemIdx}>
                      <td style={tdBase}></td>
                      <td style={tdBase}>{item.perkara}</td>
                      <td style={tdCenter}>{formatRM(item.harga_seunit)}<br /><span style={{ fontSize: '8pt', color: '#666' }}>/{item.unit}</span></td>
                      <td style={tdCenter}>{item.kuantiti} {item.unit}</td>
                      <td style={tdRight}>{formatRM(jumlahItem)}</td>
                    </tr>
                  );
                })}

                {/* Baris Subtotal Kategori */}
                <tr>
                  <td style={tdBase} colSpan={3}></td>
                  <td style={{ ...tdBase, textAlign: 'right', fontWeight: 'bold' }}>{t('kpp:doc_th_total', 'JUMLAH')}</td>
                  <td style={{ ...tdBase, textAlign: 'right', fontWeight: 'bold' }}>
                    {formatRM(subtotal)}
                  </td>
                </tr>
              </React.Fragment>
            );
          })}

          {/* Baris Jumlah Keseluruhan */}
          <tr>
            <td
              colSpan={4}
              style={{
                border: '2px solid currentColor',
                padding: '8px 10px',
                fontWeight: 'bold',
                textAlign: 'center',
              }}
            >
              {t('kpp:doc_th_grand_total', 'JUMLAH KESELURUHAN')}
            </td>
            <td
              style={{
                border: '2px solid currentColor',
                padding: '8px 10px',
                fontWeight: 'bold',
                textAlign: 'right',
              }}
            >
              {formatRM(jumlahKeseluruhan)}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Bahagian Pendapatan */}
      <div style={{ marginTop: 16, fontSize: '10pt' }}>
        <strong>{t('kpp:doc_income_section', 'PENDAPATAN:')}</strong>
        <ol style={{ marginTop: 4 }}>
          {data.pendapatan.map((p, i) => (
            <li key={i}>
              {p.sumber} = {formatRM(p.jumlah)}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

// ─── PAGE BREAK SEPARATOR ────────────────────────────────────────────────────

function PageBreak() {
  const { t } = useTranslation(['kpp', 'common']);
  return (
    <div
      className="my-12 relative flex items-center justify-center pointer-events-none select-none"
    >
      <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      <div className="absolute inset-x-0 h-px mt-1 bg-gradient-to-r from-transparent via-border/30 to-transparent" />
      
      <span
        className="relative px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60 bg-background dark:bg-[#121214] border border-border/50 rounded-full shadow-sm "
      >
        {t('kpp:new_page_break', 'MUKA SURAT BARU')}
      </span>
    </div>
  );
}

function DocumentFooter() {
  const { t } = useTranslation(['kpp', 'common']);
  return (
    <div className="mt-10 flex flex-col items-center gap-6 pointer-events-none select-none border-t border-dashed border-border/30 pt-8">
      {/* Oval / Pill Badge */}
      <div className="px-8 py-2.5 rounded-full border border-indigo-500/20 bg-indigo-500/5  flex items-center gap-3 shadow-sm">
        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
        <span className="text-[11px] font-black uppercase tracking-[0.4em] text-indigo-500/80">
          {t('kpp:end_of_document', 'Tamat Dokumen')}
        </span>
        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
      </div>
      
      {/* Decorative Brand */}
      <div className="flex flex-col items-center gap-2 opacity-30 grayscale hover:grayscale-0 transition-all">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-indigo-500 flex items-center justify-center">
            <span className="text-[10px] text-white font-bold">N</span>
          </div>
          <span className="text-xs font-black tracking-tighter text-foreground">NEXUS AI</span>
        </div>
        <p className="text-[9px] font-medium text-muted-foreground italic">Generated officially by Nexus AI Hub</p>
      </div>
    </div>
  );
}

// ─── MAIN EXPORT ─────────────────────────────────────────────────────────────

interface KertasKerjaRendererProps {
  data: KertasKerjaData;
}

export function KertasKerjaRenderer({ data }: KertasKerjaRendererProps) {
  if (!data) return null;

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '11pt', lineHeight: 1.6 }}>
      {/* ── HALAMAN MUKA ── */}
      <HalamanMuka data={data.halaman_muka} />

      <PageBreak />

      {/* ── RINGKASAN EKSEKUTIF ── */}
      <RingkasanEksekutif data={data.ringkasan_eksekutif} halaman={data.halaman_muka} />

      <PageBreak />

      {/* ── ISI KANDUNGAN (1.0 - 12.0) ── */}
      <IsiKandungan
        data={data.isi_kandungan}
        halaman={data.halaman_muka}
        ringkasan={data.ringkasan_eksekutif}
        tandatangan={data.tandatangan}
      />

      <PageBreak />

      {/* ── LAMPIRAN I: CARTA ORGANISASI ── */}
      <LampiranI data={data.carta_organisasi} tajuk={data.halaman_muka.tajuk_program} />

      <PageBreak />

      {/* ── LAMPIRAN II: TENTATIF PROGRAM ── */}
      <LampiranII data={data.tentatif} tajuk={data.halaman_muka.tajuk_program} />

      <PageBreak />

      {/* ── LAMPIRAN III: ANGGARAN BELANJAWAN ── */}
      <LampiranIII data={data.belanjawan} tajuk={data.halaman_muka.tajuk_program} />

      {/* ── PENUTUP ESTETIK ── */}
      <DocumentFooter />
    </div>
  );
}
