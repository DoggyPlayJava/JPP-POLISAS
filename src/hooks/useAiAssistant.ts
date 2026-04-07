import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';

export type AiTask = "analyze_performance" | "review_kertas_kerja" | "suggest_program" | "generate_draft" | "summarize_report" | "custom_query" | "semak_tatabahasa_laporan" | "jana_belanjawan_ai" | "pecahkan_tugasan_ai" | "jana_kertas_kerja" | "jana_minit_mesyuarat";

export interface ChatMessage {
  id: string;
  role: 'user' | 'ai' | 'error';
  content: string;
  timestamp: string; // ISO string
}

interface AiRequestParams {
  task: AiTask;
  clubId?: string;
  programId?: string;
  data?: Record<string, any>;
  query?: string; // Untuk custom input pelajar
  selectedModel?: 'flash' | 'pro'; // Pilihan pengguna untuk model
}

export function useAiAssistant() {
  const [isLoading, setIsLoading] = useState(false);       // for callAi (quick actions, modals)
  const [isChatLoading, setIsChatLoading] = useState(false); // for sendChatMessage (FloatingAiChat)
  const [result, setResult] = useState<string | null>(null);
  const cacheRef = useRef<Record<string, string>>({}); // Client-side caching

  const callAi = async (params: AiRequestParams) => {
    // Bina unique cache key
    const cacheKey = JSON.stringify({ task: params.task, clubId: params.clubId, programId: params.programId, query: params.query });

    if (cacheRef.current[cacheKey]) {
      setResult(cacheRef.current[cacheKey]); // Papar terus dari cache jika ada
      return cacheRef.current[cacheKey];
    }

    setIsLoading(true);
    setResult(null);

    try {
      const apiKey = (import.meta as any).env.VITE_GEMINI_API_KEY;
      if (!apiKey) throw new Error("Sila konfigurasikan VITE_GEMINI_API_KEY dalam fail .env anda.");

      // === SEMAKAN BAKI & KESELAMATAN NEXUS AI ===
      let taskKey = params.task as string;
      if (params.task === 'jana_kertas_kerja') {
        taskKey = params.selectedModel === 'pro' ? 'pro_kertas_kerja' : 'flash_kertas_kerja';
      } else if (params.task === 'semak_tatabahasa_laporan') {
        taskKey = 'semak_ejaan';
      } else if (params.task === 'analyze_performance' || params.task === 'review_kertas_kerja') {
        taskKey = 'analisis';
      }

      if (taskKey) {
        const { data: tokenCheck, error: tokenError } = await supabase.rpc('check_ai_tokens', { task_name: taskKey });
        if (tokenError) {
           console.error("AI access error:", tokenError);
           if (tokenError.message?.includes('Akses AI anda sedang digantung')) {
             throw new Error(tokenError.message);
           }
           throw new Error("Sistem gagal menyemak baki token Nexus AI anda.");
        }
        if (!tokenCheck?.can_afford) {
           throw new Error(`Baki Token Nexus tidak mencukupi untuk tugasan ini. Kos: ${tokenCheck.task_cost} Token. Baki semasa: ${tokenCheck.current_balance} Token.`);
        }
      }

      let systemInstruction = "Anda adalah pembantu AI yang sedia membantu dalam Bahasa Melayu.";
      let userPrompt = "";
      let outputLimit = 8192; // Default limit

      if (params.task === 'analyze_performance') {
        systemInstruction = "Anda adalah Nexus AI, penasihat penganalisis kelab berkaliber untuk platform JPP POLISAS. Anda berfikir secara kritikal dan logik berdasarkan metrik.";
        let clubData = params.data;

        if (!clubData && params.clubId) {
          const [{ data: club }, { count: members }, { data: activities }, { count: tasks }] = await Promise.all([
            supabase.from("clubs").select("name").eq("id", params.clubId).single(),
            supabase.from("student_club_memberships").select("user_id", { count: "exact", head: true }).eq("club_id", params.clubId),
            supabase.from("club_activities").select("status, budget").eq("club_id", params.clubId),
            supabase.from("club_tasks").select("id", { count: "exact", head: true }).eq("club_id", params.clubId)
          ]);
          clubData = {
            clubName: club?.name || "Kelab POLISAS", totalMembers: members || 0,
            totalActivities: activities?.length || 0, completedActivities: activities?.filter((a: any) => a.status === 'selesai').length || 0,
            usedBudget: activities?.reduce((sum: number, a: any) => sum + (a.budget || 0), 0) || 0, totalTasksIssued: tasks || 0
          };
        }
        userPrompt = `Buat analisis prestasi kelab berdasarkan data objektif ini dalam Bahasa Melayu.\n\nData Kelab:\n${JSON.stringify(clubData, null, 2)}\n\n[ARAHAN KETAT]\nHasilkan laporan yang mengandungi 3 bahagian ini secara teratur:\n## 1. Penilaian Keseluruhan\n## 2. Isu Berpotensi\n## 3. Cadangan Konkrit\n\nPENTING: Gunakan format Markdown yang SANGAT KEMAS. Gunakan \`##\` untuk tajuk, gunakan jarak baris (whitespace/enter) antara perenggan supaya tidak serabut, dan gunakan \*bullet points* untuk menyenaraikan fakta. Jangan jadikan jawapan anda sebagai satu bongkah teks (wall of text). Jangan menggunakan bahasa teknikal seperti bahasa koding.`;

      } else if (params.task === 'review_kertas_kerja') {
        systemInstruction = "Anda adalah Nexus AI, bertindak sebagai Ketua Semakan Dokumentasi Pintar bagi Majlis Perwakilan Pelajar (JPP POLISAS). Anda profesional, teliti, dan menitikberatkan rasional, perancangan kewangan, serta faedah program teknikal.";
        if (!params.programId) throw new Error("programId diperlukan untuk semakan kertas kerja.");

        const { data: program } = await supabase.from('programs').select('nama_program, deskripsi, tarikh_mula, tarikh_tamat, location, budget, status, club_id').eq('id', params.programId).single();
        if (!program) throw new Error(`Data program tidak dijumpai.`);
        const { data: club } = await supabase.from('clubs').select('name').eq('id', program.club_id).single();

        userPrompt = `Buat semakan draf Kertas Kerja Program ini sebelum diluluskan oleh Admin JPP.\n\n[ BUTIRAN KERTAS KERJA ]\n- Kelab: ${club?.name || 'Tidak Dinyatakan'}\n- Nama Program: ${program.nama_program}\n- Tarikh: ${program.tarikh_mula} hingga ${program.tarikh_tamat}\n- Anggaran Bajet: RM ${program.budget || '0'}\n- Objektif & Aktiviti: ${program.deskripsi || 'Tiada deskripsi.'}\n\n[ ARAHAN PENILAIAN ]\nTulis laporan semakan (AI Review) dalam 3 bahagian teras:\n1. Kekuatan Perancangan.\n2. Potensi Risiko & Kekurangan.\n3. Rating Kelulusan JPP.`;

      } else if (params.task === 'semak_tatabahasa_laporan') {
        systemInstruction = `Anda adalah Pakar Tatabahasa Rasmi JPP POLISAS. Tugas anda: semak dan baiki teks pelajar menjadi lebih profesional, formal, dan bebas dari sebarang kesalahan ejaan, tanda baca, atau slanga/dialek (wechat/whatsapp/singkatan).
WAJIB MEMULANGKAN JSON SAHAJA TANPA TEKS LAIN (Jangan tulis backticks markdown \`\`\`json).
Format Mesti Dipatuhi:
{
  "teguran": "Menggunakan huruf kecil untuk nama tempat, penggunaan 'diorang'.",
  "teksSemakan": "Ayat yang telah penuh dibaiki dan rasmi."
}`;
        userPrompt = `Teks Pelajar: ${params.query}`;
        outputLimit = 2500;

      } else if (params.task === 'jana_belanjawan_ai') {
        systemInstruction = `Anda adalah Bendahari Pakar di POLISAS. Pengguna meminta anda menjana pecahan belanjawan automatik berserta anggaran kos logik (Cth: Makan minum RM10/pax).
WAJIB MEMULANGKAN JSON SAHAJA TANPA BACKTICKS FORMATTING.
Format Mesti Dipatuhi:
{
  "anggaran_kasar": 1500,
  "uraian": "1. Makanan (100 pax x RM10) = RM1000\\n2. Cenderahati = RM300\\n3. Luar Jangka = RM200"
}`;
        userPrompt = `Matlamat Program: ${params.query}`;
        outputLimit = 2000;

      } else if (params.task === 'pecahkan_tugasan_ai') {
         systemInstruction = `Anda adalah Pengurus Projek Organisasi. Pengguna akan memberi satu senario tugas besar. Pecahkannya kepada 3 hingga 5 sub-tugasan fizikal/praktikal yang jelas untuk diagihkan kepada ahli-ahli lain.
WAJIB MEMULANGKAN JSON (ARRAY) SAHAJA TANPA BACKTICKS FORMATTING.
Format Mesti Dipatuhi:
[
  { "title": "Cari Penaja", "description": "Sediakan senarai syarikat penaja berpotensi dan edar surat." },
  { "title": "Urus Makanan", "description": "Dapatkan sebut harga daripada kantin atau katerer luar." }
]`;
        userPrompt = `Tugasan Utama: ${params.query}`;
        outputLimit = 2000;

      } else if (params.task === 'jana_kertas_kerja') {
        systemInstruction = `Anda adalah Pengarah Program yang mahir merangka kertas kerja rasmi JPP POLISAS. Anda MESTI mengikut format berikut secara TEPAT. Jangan gunakan blok kod \`\`\`markdown. Hasilkan dalam teks Markdown biasa bercampur HTML.

ARAHAN KRITIKAL:
- JANGAN permudahkan atau buang mana-mana bahagian format ini.
- Semua teks CENTER mesti guna tag <center>.
- Lampiran I WAJIB SEMUA unit JK tanpa kecuali.
- Lampiran III WAJIB ada pengelompokan kategori dengan subtotal DAN bahagian PENDAPATAN di penghujung.
- Bahagian 1.0 PENDAHULUAN WAJIB hanya 1 perenggan sahaja. DILARANG tulis 2 atau lebih perenggan.
- Bahagian tandatangan (Disediakan, Disemak, Disokong, Diluluskan) MESTI kekal bersama dalam satu blok.

---

<center><b>KERTAS KERJA</b></center>
<center><b>[TAJUK PROGRAM]</b></center>
<br>
<center><b>[TARIKH] ([HARI])</b></center>
<center><b>[TEMPAT]</b></center>
<br>
<center><b>ANJURAN:</b></center>
<center><b>[PENGANJUR]</b></center>
<center><b>POLITEKNIK SULTAN HAJI AHMAD SHAH</b></center>

<!-- PAGE_BREAK -->

<center><b>RINGKASAN EKSEKUTIF</b></center>
<center><b>[TAJUK PROGRAM]</b></center>

<br>

<table>
<tr><td><b>IPTA</b></td><td>Politeknik Sultan Haji Ahmad Shah</td></tr>
<tr><td><b>TAJUK PROGRAM</b></td><td>[Tajuk Program]</td></tr>
<tr><td><b>JENIS PROGRAM</b></td><td>[Jenis Program]</td></tr>
<tr><td><b>MATLAMAT/<br>PENCAPAIAN PROGRAM</b></td><td>(Tulis 2-3 matlamat dalam bentuk bernombor)</td></tr>
<tr><td><b>ANJURAN</b></td><td>[Penganjur] dengan kerjasama Jabatan Hal Ehwal Pelajar POLISAS</td></tr>
<tr><td><b>TARIKH DAN TEMPAT</b></td><td>[Tarikh], [Tempat]</td></tr>
<tr><td><b>BILANGAN PESERTA</b></td><td>Peserta: [bilangan] orang<br>Pegawai: [bilangan] orang</td></tr>
<tr><td><b>ANGGARAN KOS</b></td><td>RM [Kos]</td></tr>
</table>

<!-- PAGE_BREAK -->

**1.0 PENDAHULUAN**

(Tulis HANYA 1 perenggan penuh sahaja yang menghuraikan latar belakang & kepentingan program ini secara ringkas dan padat. DILARANG menulis lebih daripada 1 perenggan. Pastikan ia matang dan profesional.)

**2.0 NAMA PROGRAM**

[Tajuk Program Penuh]

**3.0 TUJUAN**

Kertas kerja ini dikemukakan bagi memohon kelulusan peruntukan, penggunaan peralatan serta kemudahan di POLISAS bagi melaksanakan program ini.

**4.0 MATLAMAT**

1. [Matlamat 1]
2. [Matlamat 2]
3. [Matlamat 3]

**5.0 PENGANJUR**

[Penganjur] dengan kerjasama Jabatan Hal Ehwal Pelajar (JHEP) POLISAS.

**6.0 TARIKH, MASA DAN TEMPAT**

Tarikh &nbsp;&nbsp;&nbsp;&nbsp;: [Tarikh]<br>
Masa &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: 8:00 Pagi - 5:00 Petang<br>
Tempat &nbsp;&nbsp;&nbsp;: [Tempat]

**7.0 PENYERTAAN / SASARAN**

[Bilangan] orang peserta.

**8.0 BENTUK PROGRAM**

[Nyatakan bentuk program - cth: Bengkel / Ceramah / Pertandingan]

**9.0 CARTA ORGANISASI**

Rujuk *Lampiran I*.

**10.0 TENTATIF PROGRAM**

Rujuk *Lampiran II*.

**11.0 ANGGARAN BELANJAWAN**

Rujuk *Lampiran III*.

**12.0 PENUTUP**

Berdasarkan kertas kerja ini, maka dipohon agar pihak pengurusan POLISAS dapat memberi komitmen dan sokongan bagi menjayakan program ini. Semoga yang dirancang ini dapat berjalan dengan lancar dan memenuhi matlamat dan objektif program serta memberi manfaat kepada semua siswa/siswi Politeknik Sultan Haji Ahmad Shah.

<div style="page-break-inside:avoid;">

Disediakan oleh:<br><br><br>
_____________________<br>
**[NAMA PENGARAH]**<br>
Pengarah Program<br>
[Tajuk Program]

<br><br>

Disemak oleh:<br><br><br>
_____________________<br>
**MOHD FADLI BIN ARRIF**<br>
Penasihat<br>
Jawatankuasa Perwakilan Pelajar<br>
Politeknik Sultan Haji Ahmad Shah

<br><br>

Disokong oleh:<br><br><br>
_____________________<br>
**MOHD AZLAN BIN IZUDDIN**<br>
Ketua Jabatan<br>
Hal Ehwal Pelajar<br>
Politeknik Sultan Haji Ahmad Shah

<br><br>

Diluluskan oleh:<br><br><br>
_____________________<br>
**MUSTAFIZUL HILMIE BIN ABD RAHMAN**<br>
Timbalan Pengarah (Sokongan Akademik)<br>
Politeknik Sultan Haji Ahmad Shah

</div>

<!-- PAGE_BREAK -->

<center><i><b>LAMPIRAN I</b></i></center>
<center><b>AHLI JAWATANKUASA PELAKSANA</b></center>
<center><b>[TAJUK PROGRAM]</b></center>

<br>

<center><u><b>JAWATANKUASA INDUK</b></u></center>

<br>

<center><b>PENAUNG</b></center>
<center><b>HISAMUDIN BIN MOHD TAMIM</b></center>
<center>Pengarah</center>
<center>Politeknik Sultan Haji Ahmad Shah</center>

<br>

<center><b>PENASIHAT</b></center>
<center><b>MOHD AZLAN BIN IZUDDIN</b></center>
<center>Ketua Jabatan Hal Ehwal Pelajar</center>

<br>

<center><b>MARLIANA BINTI MAHAMAD</b></center>
<center>Pegawai Hal Ehwal Pelajar</center>

<br>

<center><b>MOHD FADLI BIN ARRIF</b></center>
<center>Penasihat Jawatankuasa Perwakilan Pelajar</center>

<br>

<center><b>PENGERUSI</b></center>
<center><b>MUHAMAD AMIRUL HAKIMI BIN MOHD ZAWAWI</b></center>
<center>Yang DiPertua Jawatankuasa Perwakilan Pelajar</center>

<br><br>

<center><u><b>JAWATANKUASA MAJLIS TERTINGGI</b></u></center>

<br>

<center><b>[NAMA PENGARAH]</b></center>
<center>PENGARAH PROGRAM</center>

<br>

<center><b>(NAMA)</b></center>
<center>TIMBALAN PENGARAH PROGRAM</center>

<br>

<center><b>(NAMA)</b></center>
<center>SETIAUSAHA PROGRAM</center>

<br>

<center><b>(NAMA)</b></center>
<center>BENDAHARI PROGRAM</center>

<!-- PAGE_BREAK -->

<center><u><b>JAWATANKUASA PELAKSANA UNIT</b></u></center>

<br>

<center>JK PROTOKOL & ATURCARA</center>
<center><b>(NAMA)</b></center>
<center><b>(NAMA)</b></center>

<br>

<center>JK MULTIMEDIA</center>
<center><b>(NAMA)</b></center>
<center><b>(NAMA)</b></center>

<br>

<center>JK MAKANAN</center>
<center><b>(NAMA)</b></center>
<center><b>(NAMA)</b></center>

<br>

<center>JK PERALATAN & TEMPAT</center>
<center><b>(NAMA)</b></center>
<center><b>(NAMA)</b></center>

<br>

<center>JK KEBERSIHAN</center>
<center><b>(NAMA)</b></center>
<center><b>(NAMA)</b></center>

<br>

<center>JK PENGANGKUTAN DAN KESELAMATAN</center>
<center><b>(NAMA)</b></center>
<center><b>(NAMA)</b></center>

<br>

<center>JK CENDERAHATI</center>
<center><b>(NAMA)</b></center>
<center><b>(NAMA)</b></center>

<br>

<center>JK FASILITATOR</center>
<center><b>(NAMA)</b></center>
<center><b>(NAMA)</b></center>

<!-- PAGE_BREAK -->

<center><i><b>LAMPIRAN II</b></i></center>
<center><b>TENTATIF PROGRAM</b></center>
<center><b>[TAJUK PROGRAM]</b></center>

<br>

(Hasilkan jadual markdown dengan pengelompokan hari & tarikh sebagai baris header. Format:

| [TARIKH DAN HARI - cth: 8 APRIL 2026] | |
| --- | --- |
| **MASA** | **AKTIVITI** |
| 7:45 am - 8:00 am | Pendaftaran peserta dan agihan sarapan pagi |
| ... | ... |

Pastikan jadual terperinci dan praktikal dengan slot rehat/makan.)

<!-- PAGE_BREAK -->

<center><i><b>LAMPIRAN III</b></i></center>
<center><b>ANGGARAN PERBELANJAAN</b></center>
<center><b>[TAJUK PROGRAM]</b></center>

<br>

(Hasilkan jadual HTML perbelanjaan yang WAJIB dikelompokkan mengikut kategori besar. Setiap kategori ada subtotal JUMLAH tersendiri. Gunakan HTML table SAHAJA (BUKAN markdown table). Format MESTI seperti ini:

<table style="border-collapse:collapse;width:100%;font-size:10pt;">
<tr style="border:1px solid black;">
<td style="border:1px solid black;padding:4px 6px;font-weight:bold;text-align:center;width:8%;">BIL</td>
<td style="border:1px solid black;padding:4px 6px;font-weight:bold;text-align:center;">PERKARA</td>
<td style="border:1px solid black;padding:4px 6px;font-weight:bold;text-align:center;width:15%;">HARGA<br>SEUNIT</td>
<td style="border:1px solid black;padding:4px 6px;font-weight:bold;text-align:center;width:14%;">KUANTITI</td>
<td style="border:1px solid black;padding:4px 6px;font-weight:bold;text-align:center;width:16%;">JUMLAH</td>
</tr>
<tr>
<td style="border:1px solid black;padding:3px 6px;font-weight:bold;">1.</td>
<td style="border:1px solid black;padding:3px 6px;font-weight:bold;" colspan="4">Makanan & Minuman</td>
</tr>
<tr>
<td style="border:1px solid black;padding:3px 6px;"></td>
<td style="border:1px solid black;padding:3px 6px;">Makanan Pagi</td>
<td style="border:1px solid black;padding:3px 6px;text-align:center;">RM X.XX</td>
<td style="border:1px solid black;padding:3px 6px;text-align:center;">XXX Paket</td>
<td style="border:1px solid black;padding:3px 6px;text-align:right;">RM XXX.XX</td>
</tr>
<tr>
<td style="border:1px solid black;padding:3px 6px;"></td>
<td style="border:1px solid black;padding:3px 6px;">Makanan Tengah Hari</td>
<td style="border:1px solid black;padding:3px 6px;text-align:center;">RM X.XX</td>
<td style="border:1px solid black;padding:3px 6px;text-align:center;">XXX Paket</td>
<td style="border:1px solid black;padding:3px 6px;text-align:right;">RM XXX.XX</td>
</tr>
<tr>
<td style="border:1px solid black;padding:3px 6px;" colspan="3"></td>
<td style="border:1px solid black;padding:3px 6px;text-align:right;font-weight:bold;">JUMLAH</td>
<td style="border:1px solid black;padding:3px 6px;text-align:right;font-weight:bold;">RM XXX.XX</td>
</tr>
<tr>
<td style="border:1px solid black;padding:3px 6px;font-weight:bold;">2.</td>
<td style="border:1px solid black;padding:3px 6px;font-weight:bold;" colspan="4">Cenderahati</td>
</tr>
<tr>
<td style="border:1px solid black;padding:3px 6px;"></td>
<td style="border:1px solid black;padding:3px 6px;">Cenderahati kepada Penceramah</td>
<td style="border:1px solid black;padding:3px 6px;text-align:center;">RM X.XX</td>
<td style="border:1px solid black;padding:3px 6px;text-align:center;">X</td>
<td style="border:1px solid black;padding:3px 6px;text-align:right;">RM XX.XX</td>
</tr>
<tr>
<td style="border:1px solid black;padding:3px 6px;" colspan="3"></td>
<td style="border:1px solid black;padding:3px 6px;text-align:right;font-weight:bold;">JUMLAH</td>
<td style="border:1px solid black;padding:3px 6px;text-align:right;font-weight:bold;">RM XX.XX</td>
</tr>
<tr>
<td style="border:2px solid black;padding:5px 6px;font-weight:bold;text-align:center;" colspan="4">JUMLAH KESELURUHAN: RM [KOS]</td>
<td style="border:2px solid black;padding:5px 6px;font-weight:bold;text-align:right;">RM [KOS]</td>
</tr>
</table>

ARAHAN PENTING untuk jadual Lampiran III:
- Gunakan HTML table SAHAJA, BUKAN markdown table.
- Setiap sel WAJIB ada style="border:1px solid black;padding:3px 6px;" sebagai minimum.
- Baris kategori (1., 2., 3. dsb) gunakan colspan="4" dan font-weight:bold.
- Baris sub-item: lajur BIL kosong, PERKARA tulis nama item, HARGA SEUNIT text-align:center, KUANTITI text-align:center, JUMLAH text-align:right.
- Baris JUMLAH subtotal: colspan="3" kosong pada 3 lajur pertama, lajur KUANTITI tulis "JUMLAH" (bold, right-align), lajur JUMLAH tulis nilai (bold, right-align).
- Baris terakhir JUMLAH KESELURUHAN gunakan border:2px solid black dan font-weight:bold.
- Pastikan JUMLAH KESELURUHAN selari dengan anggaran kos yang diberikan.
- Cipta sekurang-kurangnya 3-4 kategori yang munasabah berdasarkan jenis program.

Selepas jadual di atas, WAJIB masukkan bahagian ini:

**PENDAPATAN:**<br>
1. OS42000 = RM 0.00
)
`;

        userPrompt = `Tolong jana draf kertas kerja LENGKAP menggunakan format MESTI di atas. Ikutilah setiap bahagian tanpa terkecuali. JANGAN langkau mana-mana bahagian termasuk bahagian PENDAPATAN dalam Lampiran III.

Nota konteks tambahan: Program ini berbentuk ${params.data?.bentukProgram}. Walau bagaimanapun, JANGAN sebutkan bentuk program ini dalam draf anda, gunakan ia sekadar untuk memahami skala program dan merangka tentatif & belanjawan yang logik sahaja.

Input Teras:
- Tajuk: ${params.data?.tajuk}
- Jenis Program: ${params.data?.jenisProgram}
- Objektif/Matlamat: ${params.data?.objektif}
- Tarikh: ${params.data?.tarikh}
- Tempat: ${params.data?.tempat}
- Penganjur: ${params.data?.penganjur}
- Sasaran Peserta: ${params.data?.sasaran} (Sila agihkan "Peserta" dan letakkan ${params.data?.bilanganPegawai || '5'} untuk "Pegawai" di dalam jadual Ringkasan Eksekutif)
- Anggaran Kos Keseluruhan: RM ${params.data?.kos}
- Nama Pengarah Program: ${params.data?.pengarah}`;
        outputLimit = 8192;

      } else if (params.task === 'jana_minit_mesyuarat') {
        systemInstruction = "Anda adalah Setiausaha Kehormat persatuan yang teliti. Tugas anda ialah mengubah nota atau gambar draf kepada minit mesyuarat rasmi dengan susunan profesional: \n" +
          "MINIT MESYUARAT [TAJUK/PROGRAM] BIL: ___\n" +
          "TARIKH: \nMASA: \nPLATFORM/TEMPAT: \n" +
          "KEHADIRAN: (Bina jadual bil/nama ringkas)\n\n" +
          "AGENDA:\n1. UCAPAN ALUAN\n2. PERKARA BERBANGKIT\n3. PROGRAM UNTUK PERBINCANGAN (pecahkan mengikut unit contohnya: Protokol, Multimedia, Makanan dsb - nyatakan Permasalahan & Penambahbaikan berdasarkan nota/rajah)\n4. PENANGGUHAN MESYUARAT\n\nTandatangan (Disediakan Oleh & Disahkan Oleh).\nSusun sekemas mungkin mengikut format Markdown yang diberikan.";
        userPrompt = `Tajuk/Perkara: ${params.data?.tajuk}\n\nNota Mentah / Kasar:\n${params.data?.nota || 'Rujuk gambar yang dilampirkan'}`;
        outputLimit = 8192;

      } else if (params.task === 'custom_query') {
        systemInstruction = "Anda adalah Nexus AI, enjin kecerdasan buatan rasmi bagi platform e-KPP JPP POLISAS. Nama anda 'Nexus AI' melambangkan peranan anda sebagai pusat integrasi data dan bantuan pintar untuk warga POLISAS. Anda HANYA DIBENARKAN untuk menjawab hal-hal berkaitan kelab, persatuan, dokumentasi aktiviti, dan maklumat kampus POLISAS. Jika subjek di luar skop ini, tolak dengan sopan.\n\nARAHAN WAJIB (STRICT): Anda mesti merumuskan jawapan kepada yang SANGAT PENDEK, mesra, dan santai. JANGAN berikan jawapan panjang lebar melainkan jika betul betul mendesak";
        userPrompt = `Pertanyaan Pelajar: ${params.query}`;
        outputLimit = 700;

      } else if (params.task === 'suggest_program') {
        systemInstruction = "Anda adalah Pegawai Hal Ehwal Pelajar JPP POLISAS yang kreatif dan berpengalaman dalam menganjurkan program berkualiti untuk pelajar politeknik.";
        userPrompt = `Cadangkan LIMA (5) idea program atau aktiviti pelajar yang menarik, praktikal, dan berimpak tinggi untuk kelab/persatuan di POLISAS.\n\nFokus Utama: ${params.data?.fokus || 'Meningkatkan perpaduan dan penglibatan aktif pelajar'}\n\n[FORMAT WAJIB — gunakan Markdown]\nUntuk setiap cadangan, nyatakan:\n- **Nama Program** (pendek & menarik)\n- Objektif ringkas (1 ayat)\n- Cadangan tarikh/tempoh\n\nJawab dalam Bahasa Melayu yang mesra dan profesional.`;
        outputLimit = 1500;

      } else {
        systemInstruction = "Anda adalah pembantu AI integrasi JPP POLISAS.";
        userPrompt = `Selesaikan tugas: ${params.task} berasaskan data berikut: ${JSON.stringify(params.data || {})}`;
      }

      const modelEndpointString = params.selectedModel === 'pro' ? 'gemini-1.5-pro' : 'gemini-2.5-flash';
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelEndpointString}:generateContent`;

      const contentsParts: any[] = [{ text: userPrompt }];

      // Rawat Base64 Imej jika ada (Multimodal)
      if (params.data?.images && Array.isArray(params.data.images)) {
        params.data.images.forEach((img: any) => {
          if (img.base64 && img.mimeType) {
            // potong "data:image/jpeg;base64," if provided
            const cleanBase64 = img.base64.replace(/^data:image\/\w+;base64,/, "");
            contentsParts.push({
              inlineData: {
                data: cleanBase64,
                mimeType: img.mimeType
              }
            });
          }
        });
      }

      const response = await fetch(`${endpoint}?key=${apiKey}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemInstruction }] },
          contents: [{ parts: contentsParts }],
          generationConfig: { temperature: 0.5, maxOutputTokens: outputLimit, topP: 0.9 },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error?.message || `Google API Error: ${response.status}`);
      }

      const responseData = await response.json();

      // Safety Filter Checks
      const finishReason = responseData?.candidates?.[0]?.finishReason;
      if (finishReason === 'SAFETY') {
        throw new Error("Mesej anda telah disekat kerana mengandungi elemen yang tidak mematuhi Polisi Keselamatan JPP/Google.");
      }

      const text = responseData?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) throw new Error("Maklumbalas AI kosong atau tidak sah.");

      // === TOLAK TOKEN JIKA BERJAYA ===
      let spendKey = params.task as string;
      if (params.task === 'jana_kertas_kerja') {
        spendKey = params.selectedModel === 'pro' ? 'pro_kertas_kerja' : 'flash_kertas_kerja';
      } else if (params.task === 'semak_tatabahasa_laporan') {
        spendKey = 'semak_ejaan';
      } else if (params.task === 'analyze_performance' || params.task === 'review_kertas_kerja') {
        spendKey = 'analisis';
      }
      
      if (spendKey) {
         await supabase.rpc('spend_ai_tokens', { task_name: spendKey });
      }

      cacheRef.current[cacheKey] = text; // Simpan ke dalam cache
      setResult(text);
      return text;

    } catch (e: any) {
      console.error("AI Assistant Error:", e);
      const errorMsg = e.message || String(e);

      if (errorMsg.includes('flagged') || errorMsg.includes('banned')) {
        toast.error(errorMsg, { duration: 5000 });
      } else if (errorMsg.includes('Polisi Keselamatan') || errorMsg.includes('kehabisan kuota') || errorMsg.includes('tidak mencukupi')) {
        toast.error(errorMsg);
      } else {
        // Ralat teknikal (API over quota, crash, dsbgnya)
        toast.error("Sistem sedang sibuk, sila cuba lagi!");

        // Beritahu SUPER_ADMIN_JPP secara rahsia
        try {
          const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'SUPER_ADMIN_JPP');
          if (admins && admins.length > 0) {
            const payload = admins.map((admin: any) => ({
              user_id: admin.id,
              title: '🚨 Kerosakan Sistem AI',
              message: `Sistem AI tergendala: ${errorMsg.substring(0, 200)}... Sila semak kuota Gemini API.`,
            }));
            await supabase.from('notifications').insert(payload);
          }
        } catch (logErr) {
          console.error("Gagal menghantar notifikasi ralat: ", logErr);
        }
      }

      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // --- Multi-turn chat function for FloatingAiChat ---
  const sendChatMessage = async (
    userText: string,
    history: ChatMessage[]
  ): Promise<string | null> => {
    setIsChatLoading(true);
    try {
      // === SEMAKAN KESELAMATAN & AUDIT CHAT ===
      const { error: usageError } = await supabase.rpc('check_ai_tokens', { task_name: 'chat' });
      if (usageError) {
        if (usageError.message?.includes('digantung') || usageError.message?.includes('kekal')) {
          throw new Error(usageError.message);
        }
      }

      const apiKey = (import.meta as any).env.VITE_GEMINI_API_KEY;
      if (!apiKey) throw new Error('Sila konfigurasikan VITE_GEMINI_API_KEY dalam fail .env anda.');

      const systemInstruction = [
        'Nama anda adalah Nexus AI.',
        'Anda adalah enjin kecerdasan buatan (AI) rasmi bagi platform e-KPP JPP POLISAS (Jabatan Pelajar Politeknik Sultan Abdul Aziz Shah).',
        'Anda telah dibangunkan sebagai identiti Nexus AI untuk memberikan bantuan pintar, automasi dokumentasi, dan analisis data bagi kelab dan persatuan di POLISAS.',
        'Jika pengguna bertanya siapa anda atau apa itu Nexus AI, terangkan bahawa anda adalah "otak" digital di sebalik platform ini yang direka untuk memudahkan urusan pentadbiran pelajar.',
        '',
        '== SKOP JAWAPAN ==',
        'Anda HANYA DIBENARKAN menjawab soalan berkaitan kelab pelajar, persatuan, dokumentasi aktiviti, maklumat umum kampus POLISAS, serta fungsi-fungsi yang ada dalam platform ini.',
        '',
        '== PERATURAN UTAMA: ANTI-REKAAN (WAJIB DIPATUHI) ==',
        '1. JANGAN SEKALI-KALI mereka, meneka, atau mengarang fakta, singkatan, nama jawatan, nama dokumen, atau maklumat institusi yang anda tidak pasti.',
        '2. Jika pengguna bertanya tentang singkatan atau kod dalaman (contoh: KJ JSKK, BPK, JK3 dll) yang anda TIDAK PASTI maknanya — AKUI dengan jujur bahawa anda tidak tahu. Contoh: "Maaf, saya tidak pasti maksud singkatan itu. Sila rujuk pihak JPP atau dokumen rasmi untuk pengesahan."',
        '3. Jika anda tidak mempunyai maklumat yang cukup — JANGAN reka jawapan. Katakan "Saya tidak pasti, sila semak dengan pihak berkaitan."',
        '4. Lebih baik mengaku tidak tahu daripada memberikan maklumat yang salah.',
        '',
        '== FORMAT ==',
        'Jawapan mestilah PENDEK, mesra, dan santai. JANGAN berikan jawapan panjang melainkan jika amat perlu.',
        'Jika soalan di luar skop JPP POLISAS, tolak dengan sopan.',
      ].join('\n');

      // Build alternating user/model turns — exclude error bubbles, cap at 12 messages (6 turns)
      const validHistory = history
        .filter((m) => m.role === 'user' || m.role === 'ai')
        .reduce<ChatMessage[]>((acc, msg) => {
          if (acc.length > 0 && acc[acc.length - 1].role === msg.role) {
            acc[acc.length - 1] = msg; // merge consecutive same-role
          } else {
            acc.push(msg);
          }
          return acc;
        }, [])
        .slice(-12);

      const contents = [
        ...validHistory.map((m) => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.content }],
        })),
        { role: 'user', parts: [{ text: userText }] },
      ];

      const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
      const response = await fetch(`${endpoint}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemInstruction }] },
          contents,
          generationConfig: { temperature: 0.3, maxOutputTokens: 700, topP: 0.85 },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error?.message || `Google API Error: ${response.status}`);
      }

      const responseData = await response.json();
      const finishReason = responseData?.candidates?.[0]?.finishReason;
      if (finishReason === 'SAFETY') {
        throw new Error('Mesej anda telah disekat kerana mengandungi elemen yang tidak mematuhi Polisi Keselamatan JPP/Google.');
      }

      const text = responseData?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('Maklumbalas AI kosong atau tidak sah.');

      // === LOG PENGGUNAAN CHAT UNTUK AUDIT (DEEP ANALYSIS) ===
      await supabase.rpc('spend_ai_tokens', { task_name: 'chat' });

      return text;

    } catch (e: any) {
      console.error('Chat AI Error:', e);
      const errorMsg = e.message || String(e);
      if (errorMsg.includes('digantung') || errorMsg.includes('kekal')) {
        toast.error(errorMsg, { duration: 5000 });
      } else if (errorMsg.includes('Polisi Keselamatan')) {
        toast.error(errorMsg);
      } else {
        toast.error('Sistem sedang sibuk, sila cuba lagi!');
      }
      return null;
    } finally {
      setIsChatLoading(false);
    }
  };

  return { callAi, sendChatMessage, isLoading, isChatLoading, result, setResult };
}

