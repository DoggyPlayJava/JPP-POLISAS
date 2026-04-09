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
  return (
    <div style={{ textAlign: 'center', lineHeight: 2 }}>
      <div style={{ fontWeight: 'bold', fontSize: '13pt' }}>KERTAS KERJA</div>
      <div style={{ fontWeight: 'bold', fontSize: '13pt' }}>{data.tajuk_program}</div>
      <br />
      <div style={{ fontWeight: 'bold' }}>{data.tarikh} ({data.hari})</div>
      <div style={{ fontWeight: 'bold' }}>{data.tempat}</div>
      <br />
      <div style={{ fontWeight: 'bold' }}>ANJURAN:</div>
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
  return (
    <>
      <div style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: 12 }}>
        RINGKASAN EKSEKUTIF
        <br />
        {halaman.tajuk_program}
      </div>
      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '10pt' }}>
        <tbody>
          <tr>
            <td style={{ ...tdBase, width: '35%', fontWeight: 'bold' }}>IPTA</td>
            <td style={tdBase}>Politeknik Sultan Haji Ahmad Shah</td>
          </tr>
          <tr>
            <td style={tdBold}>TAJUK PROGRAM</td>
            <td style={tdBase}>{halaman.tajuk_program}</td>
          </tr>
          <tr>
            <td style={tdBold}>JENIS PROGRAM</td>
            <td style={tdBase}>{data.jenis_program}</td>
          </tr>
          <tr>
            <td style={tdBold}>MATLAMAT/PENCAPAIAN PROGRAM</td>
            <td style={tdBase}>
              <ol style={{ margin: 0, paddingLeft: 18 }}>
                {data.matlamat.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ol>
            </td>
          </tr>
          <tr>
            <td style={tdBold}>ANJURAN</td>
            <td style={tdBase}>{halaman.penganjur} dengan kerjasama Jabatan Hal Ehwal Pelajar POLISAS</td>
          </tr>
          <tr>
            <td style={tdBold}>TARIKH DAN TEMPAT</td>
            <td style={tdBase}>{halaman.tarikh}, {halaman.tempat}</td>
          </tr>
          <tr>
            <td style={tdBold}>BILANGAN PESERTA</td>
            <td style={tdBase}>
              Peserta: {data.bilangan_peserta} orang
              <br />
              Pegawai: {data.bilangan_pegawai} orang
            </td>
          </tr>
          <tr>
            <td style={tdBold}>ANGGARAN KOS</td>
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
  return (
    <div style={{ lineHeight: 1.8, fontSize: '11pt' }}>
      <p><strong>1.0 PENDAHULUAN</strong></p>
      <p style={{ textAlign: 'justify' }}>{data.pendahuluan}</p>

      <p><strong>2.0 NAMA PROGRAM</strong></p>
      <p>{data.nama_program}</p>

      <p><strong>3.0 TUJUAN</strong></p>
      <p>{data.tujuan}</p>

      <p><strong>4.0 MATLAMAT</strong></p>
      <ol>
        {data.matlamat.map((m, i) => (
          <li key={i}>{m}</li>
        ))}
      </ol>

      <p><strong>5.0 PENGANJUR</strong></p>
      <p>{halaman.penganjur} dengan kerjasama Jabatan Hal Ehwal Pelajar (JHEP) POLISAS.</p>

      <p><strong>6.0 TARIKH, MASA DAN TEMPAT</strong></p>
      <p>
        Tarikh&nbsp;&nbsp;&nbsp;&nbsp;: {halaman.tarikh}<br />
        Masa&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: 8:00 Pagi - 5:00 Petang<br />
        Tempat&nbsp;&nbsp;&nbsp;: {halaman.tempat}
      </p>

      <p><strong>7.0 PENYERTAAN / SASARAN</strong></p>
      <p>{ringkasan.bilangan_peserta} orang peserta.</p>

      <p><strong>8.0 BENTUK PROGRAM</strong></p>
      <p>{data.bentuk_program}</p>

      <p><strong>9.0 CARTA ORGANISASI</strong></p>
      <p>Rujuk <em>Lampiran I</em>.</p>

      <p><strong>10.0 TENTATIF PROGRAM</strong></p>
      <p>Rujuk <em>Lampiran II</em>.</p>

      <p><strong>11.0 ANGGARAN BELANJAWAN</strong></p>
      <p>Rujuk <em>Lampiran III</em>.</p>

      <p><strong>12.0 PENUTUP</strong></p>
      <p style={{ textAlign: 'justify' }}>
        Berdasarkan kertas kerja ini, maka dipohon agar pihak pengurusan POLISAS dapat memberi komitmen
        dan sokongan bagi menjayakan program ini. Semoga yang dirancang ini dapat berjalan dengan lancar
        dan memenuhi matlamat dan objektif program serta memberi manfaat kepada semua siswa/siswi
        Politeknik Sultan Haji Ahmad Shah.
      </p>

      {/* Blok Tandatangan */}
      <div style={{ pageBreakInside: 'avoid' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 24 }}>
          <tbody>
            <tr>
              <td style={{ width: '50%', verticalAlign: 'top', paddingRight: 24 }}>
                Disediakan oleh:
                <br /><br /><br />
                _____________________<br />
                <strong>{tandatangan.pengarah_program}</strong><br />
                Pengarah Program<br />
                {halaman.tajuk_program}
              </td>
              <td style={{ width: '50%', verticalAlign: 'top', paddingLeft: 24 }}>
                Disemak oleh:
                <br /><br /><br />
                _____________________<br />
                <strong>{tandatangan.penasihat_jpp}</strong><br />
                Penasihat<br />
                Jawatankuasa Perwakilan Pelajar<br />
                Politeknik Sultan Haji Ahmad Shah
              </td>
            </tr>
            <tr>
              <td style={{ verticalAlign: 'top', paddingRight: 24, paddingTop: 32 }}>
                Disokong oleh:
                <br /><br /><br />
                _____________________<br />
                <strong>{tandatangan.ketua_jabatan_hep}</strong><br />
                Ketua Jabatan<br />
                Hal Ehwal Pelajar<br />
                Politeknik Sultan Haji Ahmad Shah
              </td>
              <td style={{ verticalAlign: 'top', paddingLeft: 24, paddingTop: 32 }}>
                Diluluskan oleh:
                <br /><br /><br />
                _____________________<br />
                <strong>{tandatangan.timbalan_pengarah}</strong><br />
                Timbalan Pengarah (Sokongan Akademik)<br />
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
  const { jawatankuasa_induk: jki, jawatankuasa_majlis_tertinggi: jmt, unit_pelaksana: up } = data;

  return (
    <div style={{ textAlign: 'center', lineHeight: 2 }}>
      <div style={{ fontStyle: 'italic', fontWeight: 'bold' }}>LAMPIRAN I</div>
      <div style={{ fontWeight: 'bold' }}>AHLI JAWATANKUASA PELAKSANA</div>
      <br />

      <div style={{ textDecoration: 'underline', fontWeight: 'bold' }}>JAWATANKUASA INDUK</div>
      <br />

      <div style={{ fontWeight: 'bold' }}>PENAUNG</div>
      <div style={{ fontWeight: 'bold' }}>{jki.penaung.nama}</div>
      <div>{jki.penaung.jawatan}</div>
      <br />

      <div style={{ fontWeight: 'bold' }}>PENASIHAT</div>
      {jki.penasihat.map((p, i) => (
        <div key={i}>
          <div style={{ fontWeight: 'bold' }}>{p.nama}</div>
          <div>{p.jawatan}</div>
          <br />
        </div>
      ))}

      <div style={{ fontWeight: 'bold' }}>PENGERUSI</div>
      <div style={{ fontWeight: 'bold' }}>{jki.pengerusi.nama}</div>
      <div>{jki.pengerusi.jawatan}</div>
      <br /><br />

      <div style={{ textDecoration: 'underline', fontWeight: 'bold' }}>JAWATANKUASA MAJLIS TERTINGGI</div>
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
        <div style={{ textDecoration: 'underline', fontWeight: 'bold' }}>JAWATANKUASA PELAKSANA UNIT</div>
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
  return (
    <div>
      <div style={{ textAlign: 'center', fontStyle: 'italic', fontWeight: 'bold' }}>LAMPIRAN II</div>
      <div style={{ textAlign: 'center', fontWeight: 'bold' }}>TENTATIF PROGRAM</div>
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
                <td style={{ ...tdBold, textAlign: 'center', width: '30%' }}>MASA</td>
                <td style={{ ...tdBold, textAlign: 'center' }}>AKTIVITI</td>
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
  const jumlahKeseluruhan = hitungJumlahKeseluruhan(data.kategori);

  return (
    <div>
      <div style={{ textAlign: 'center', fontStyle: 'italic', fontWeight: 'bold' }}>LAMPIRAN III</div>
      <div style={{ textAlign: 'center', fontWeight: 'bold' }}>ANGGARAN PERBELANJAAN</div>
      <div style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: 16 }}>{tajuk}</div>

      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '10pt' }}>
        <thead>
          <tr>
            <td style={{ ...tdBold, textAlign: 'center', width: '8%' }}>BIL</td>
            <td style={{ ...tdBold, textAlign: 'center' }}>PERKARA</td>
            <td style={{ ...tdBold, textAlign: 'center', width: '16%' }}>HARGA<br />SEUNIT</td>
            <td style={{ ...tdBold, textAlign: 'center', width: '14%' }}>KUANTITI</td>
            <td style={{ ...tdBold, textAlign: 'center', width: '17%' }}>JUMLAH</td>
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
                  <td style={{ ...tdBase, textAlign: 'right', fontWeight: 'bold' }}>JUMLAH</td>
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
              JUMLAH KESELURUHAN
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
        <strong>PENDAPATAN:</strong>
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
  return (
    <div
      className="my-12 relative flex items-center justify-center pointer-events-none select-none"
    >
      <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      <div className="absolute inset-x-0 h-px mt-1 bg-gradient-to-r from-transparent via-border/30 to-transparent" />
      
      <span
        className="relative px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60 bg-background dark:bg-[#121214] border border-border/50 rounded-full shadow-sm backdrop-blur-sm"
      >
        MUKA SURAT BARU
      </span>
    </div>
  );
}

function DocumentFooter() {
  return (
    <div className="mt-10 flex flex-col items-center gap-6 pointer-events-none select-none border-t border-dashed border-border/30 pt-8">
      {/* Oval / Pill Badge */}
      <div className="px-8 py-2.5 rounded-full border border-indigo-500/20 bg-indigo-500/5 backdrop-blur-sm flex items-center gap-3 shadow-sm">
        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
        <span className="text-[11px] font-black uppercase tracking-[0.4em] text-indigo-500/80">
          Tamat Dokumen
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
