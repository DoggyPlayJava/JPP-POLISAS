import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';
import { API_BASE_URL } from '@/lib/utils';

export const invokeLocalApi = async (path: string, options: any) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    
    const apiPath = path.startsWith('/api/') ? path : `/api/${path}`;
    const response = await fetch(`${API_BASE_URL}${apiPath}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify(options?.body || {})
    });
    
    if (!response.ok) {
      const errText = await response.text();
      return { data: null, error: new Error(errText) };
    }
    
    const data = await response.json();
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export type AiTask = "analyze_performance" | "review_kertas_kerja" | "suggest_program" | "generate_draft" | "summarize_report" | "custom_query" | "semak_tatabahasa_laporan" | "jana_belanjawan_ai" | "pecahkan_tugasan_ai" | "jana_kertas_kerja" | "jana_minit_mesyuarat";

export interface ChatMessage {
  id: string;
  role: 'user' | 'ai' | 'error';
  content: string;
  timestamp: string; // ISO string
}

export interface ChatContext {
  currentPage?: string;
  clubInfo?: {
    name: string;
    membersCount?: number;
    pendingReports?: number;
    activePrograms?: number;
  };
  userRole?: string;
  recentNotifications?: string[];
  allClubs?: string; // Teks yang dirumuskan mengenai semua kelab
  jppOrganization?: string; // Senarai JPP (YDP, Exco, MT)
  upcomingPrograms?: string;
  committee?: string;
  pendingTasksCount?: number;
  tokenBalance?: number;
  subscriptionTier?: string;
  // Module-specific context
  akademikInfo?: {
    cgpa?: number;
    statusUnlock?: string;
    meritPoints?: number;
  };
  keusahawananInfo?: {
    activeShifts?: string;
    shopName?: string;
    isManager?: boolean;
    todaySales?: number;
    lowStockCount?: number;
  };
  jppHqInfo?: {
    totalPendingReports?: number;
    totalMeritPending?: number;
  };
  kebajikanInfo?: {
    role: string;
    // Exco-specific enriched fields:
    urgentTicketsList?: string;       // formatted list: ticket_no | title | category | age
    assignedToMeList?: string;        // my assigned tickets with age
    totalWarning?: number;
    totalEscalated?: number;
    unassignedCount?: number;
    resolvedThisWeek?: number;
    topCategoryThisMonth?: string;
    slaConfig?: string;               // "Warning: 48j, Escalation: 72j"
    currentTicket?: string;           // Full detail of ticket currently open on screen
    // Student / shared fields:
    activeTicketsCount?: number;
    urgentTicketsUnresolved?: number;
    assignedToMe?: number;
    recentTickets?: string;
  };
  polymartInfo?: {
    userType: string;
    activePurchases?: number;
    recentPurchases?: string;
    pendingIncomingOrders?: number;
    systemNote?: string;
  };
  PolyMapsInfo?: any;
  polyRiderInfo?: any;
  takwimInfo?: {
    upcomingEvents?: string;    // formatted list of upcoming takwim entries (limit 10)
    pastEvents?: string;        // last 5 events before today for historical context
    upcomingCuti?: string;      // formatted list of upcoming cuti umum
    totalUpcoming?: number;
    accessScope?: string;       // what the user can see: 'JPP_FULL' | 'STUDENT'
    clubPrograms?: string;      // upcoming programs from the user's registered club(s)
    clubProgramsName?: string;  // name(s) of the club(s) for context
  };
}

interface AiRequestParams {
  task: AiTask;
  clubId?: string;
  programId?: string;
  data?: Record<string, any>;
  query?: string; // Untuk custom input pelajar
  selectedModel?: 'flash' | 'pro'; // Pilihan pengguna untuk model
  concise?: boolean; // Pilihan untuk jawapan ringkas (TL;DR)
}

export function useAiAssistant() {
  const [isLoading, setIsLoading] = useState(false);       // for callAi (quick actions, modals)
  const [isChatLoading, setIsChatLoading] = useState(false); // for sendChatMessage (FloatingAiChat)
  const [retryCount, setRetryCount] = useState(0);
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
      // Security: VITE_GEMINI_API_KEY removed from frontend. Request proxied through Edge Function.

      // === SEMAKAN BAKI & KESELAMATAN NEXUS AI ===
      let taskKey = params.task as string;
      if (params.task === 'jana_kertas_kerja') {
        taskKey = params.selectedModel === 'pro' ? 'pro_kertas_kerja' : 'flash_kertas_kerja';
      } else if (params.task === 'jana_minit_mesyuarat') {
        taskKey = params.data?.selectedModel === 'pro' ? 'pro_minit_mesyuarat' : 'flash_minit_mesyuarat';
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

      let systemInstruction = "Anda adalah pembantu AI yang sedia membantu dalam Bahasa Melayu. PERATURAN TERMINOLOGI: Sila kaitkan 'Laporan Bulanan' dengan 'Laporan Aktiviti' dalam pangkalan data. PENTING: JANGAN SEKALI-KALI menggunakan istilah 'Laporan Aktiviti' dalam jawapan anda kepada pengguna. Anda WAJIB menggunakan 'Laporan Bulanan' sahaja walaupun data mentah menunjukkan sebaliknya.";
      let userPrompt = "";
      let outputLimit = params.concise ? 800 : 8192; // Hadkan output jika mod ringkas

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
        userPrompt = `Buat analisis prestasi kelab berdasarkan data objektif ini dalam Bahasa Melayu.\n\nData Kelab:\n${JSON.stringify(clubData, null, 2)}\n\n[ARAHAN KETAT]\nHasilkan laporan yang mengandungi 3 bahagian ini secara teratur:\n## 1. Penilaian Keseluruhan\n## 2. Isu Berpotensi\n## 3. Cadangan Konkrit\n\nPENTING: Gunakan format Markdown yang SANGAT KEMAS. Gunakan \`##\` untuk tajuk, gunakan jarak baris (whitespace/enter) antara perenggan supaya tidak serabut, dan gunakan \*bullet points* untuk menyenaraikan fakta. Jangan jadikan jawapan anda sebagai satu bongkah teks (wall of text). Jangan menggunakan bahasa teknikal seperti bahasa koding.${params.concise ? '\n\nMOD RINGKAS AKTIF: Sila berikan analisis yang sangat padat, gunakan bullet points untuk setiap bahagian, dan elakkan ayat berbunga. Cukup sekadar 2-3 poin penting bagi setiap kategori.' : ''}`;

      } else if (params.task === 'review_kertas_kerja') {
        systemInstruction = "Anda adalah Nexus AI, bertindak sebagai Ketua Semakan Dokumentasi Pintar bagi Jawatankuasa Perwakilan Pelajar (JPP POLISAS). Anda profesional, teliti, dan menitikberatkan rasional, perancangan kewangan, serta faedah program teknikal. PERATURAN TERMINOLOGI: Sentiasa gunakan 'Laporan Bulanan' untuk merujuk kepada 'Laporan Aktiviti'.";
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
        systemInstruction = `Anda adalah Jurutulis Kertas Kerja Rasmi JPP POLISAS. Tugas anda HANYA menghasilkan data berstruktur dalam format JSON murni.

PERATURAN OUTPUT (WAJIB DIPATUHI TANPA PENGECUALIAN):
1. Pulangkan JSON SAHAJA. TIADA backticks, tiada markdown, tiada teks tambahan, tiada penerangan.
2. Output mesti bermula dengan { dan berakhir dengan }.
3. Semua string dalam JSON mesti dalam Bahasa Melayu formal dan profesional.

PERATURAN MATEMATIK MUTLAK (KRITIKAL):
- Sistem React akan mengira jumlah setiap item (harga_seunit x kuantiti) secara automatik.
- ANDA WAJIB memastikan: apabila semua (harga_seunit x kuantiti) dijumlahkan bagi semua kategori, hasilnya SANGAT HAMPIR dengan anggaran_kos yang diberi (selisih maksimum RM 5).
- Agihkan harga_seunit dan kuantiti yang realistik dan logik.

SKEMA JSON YANG WAJIB DIIKUTI (jangan ubah nama kunci/key):
{
  "halaman_muka": {
    "tajuk_program": "string",
    "tarikh": "string",
    "hari": "string",
    "tempat": "string",
    "penganjur": "string"
  },
  "ringkasan_eksekutif": {
    "jenis_program": "string",
    "matlamat": ["string", "string", "string"],
    "bilangan_peserta": 0,
    "bilangan_pegawai": 0,
    "anggaran_kos": 0.00
  },
  "isi_kandungan": {
    "pendahuluan": "string — WAJIB HANYA 1 perenggan sahaja",
    "nama_program": "string",
    "tujuan": "Kertas kerja ini dikemukakan bagi memohon kelulusan peruntukan, penggunaan peralatan serta kemudahan di POLISAS bagi melaksanakan program ini.",
    "matlamat": ["string", "string", "string"],
    "bentuk_program": "string"
  },
  "carta_organisasi": {
    "jawatankuasa_induk": {
      "penaung": { "nama": "HISAMUDIN BIN MOHD TAMIM", "jawatan": "Pengarah, Politeknik Sultan Haji Ahmad Shah" },
      "penasihat": [
        { "nama": "MOHD AZLAN BIN IZUDDIN", "jawatan": "Ketua Jabatan Hal Ehwal Pelajar" },
        { "nama": "MARLIANA BINTI MAHAMAD", "jawatan": "Pegawai Hal Ehwal Pelajar" },
        { "nama": "MOHD FADLI BIN ARRIF", "jawatan": "Penasihat Jawatankuasa Perwakilan Pelajar" }
      ],
      "pengerusi": { "nama": "MUHAMAD AMIRUL HAKIMI BIN MOHD ZAWAWI", "jawatan": "Yang DiPertua Jawatankuasa Perwakilan Pelajar" }
    },
    "jawatankuasa_majlis_tertinggi": [
      { "nama": "__PENGARAH__", "jawatan": "PENGARAH PROGRAM" },
      { "nama": "(NAMA)", "jawatan": "TIMBALAN PENGARAH PROGRAM" },
      { "nama": "(NAMA)", "jawatan": "SETIAUSAHA PROGRAM" },
      { "nama": "(NAMA)", "jawatan": "BENDAHARI PROGRAM" }
    ],
    "unit_pelaksana": [
      { "nama_unit": "JK [NAMA UNIT 1]", "ahli": ["(NAMA)", "(NAMA)"] },
      { "nama_unit": "JK [NAMA UNIT 2]", "ahli": ["(NAMA)", "(NAMA)"] }
    ]
  },
  "tentatif": [
    {
      "tarikh": "DD BULAN TAHUN",
      "hari": "NAMA HARI",
      "slot": [
        { "masa_mula": "07:30", "masa_tamat": "08:00", "aktiviti": "string" }
      ]
    }
  ],
  "belanjawan": {
    "kategori": [
      {
        "nama_kategori": "string",
        "items": [
          { "perkara": "string", "harga_seunit": 0.00, "kuantiti": 0, "unit": "pax" }
        ]
      }
    ],
    "pendapatan": [
      { "sumber": "OS42000", "jumlah": 0.00 }
    ]
  },
  "tandatangan": {
    "pengarah_program": "__PENGARAH__",
    "penasihat_jpp": "MOHD FADLI BIN ARRIF",
    "ketua_jabatan_hep": "MOHD AZLAN BIN IZUDDIN",
    "timbalan_pengarah": "MUSTAFIZUL HILMIE BIN ABD RAHMAN"
  }
}

ARAHAN KHUSUS unit_pelaksana:
- Tentukan sendiri 5-8 unit JK yang SESUAI dengan jenis program. Contoh: JK PROTOKOL & ATURCARA, JK MULTIMEDIA & PUBLISITI, JK MAKANAN & MINUMAN, JK PERALATAN & TEMPAT, JK KEBERSIHAN & KECERIAAN, JK PENGANGKUTAN & KESELAMATAN, JK FASILITATOR, JK CENDERAHATI & HADIAH.
- Nama ahli: gunakan "(NAMA)" sebagai placeholder, KECUALI jika nama ahli disediakan dalam input.

ARAHAN KHUSUS tentatif:
- Hasilkan satu objek hari BAGI SETIAP HARI dalam tempoh program (cth: tarikh 15-18 Mei = 4 objek hari).
- Setiap hari WAJIB ada minimum 6 slot termasuk slot rehat/solat/makan tengah hari.
- Format masa: "HH:MM" dalam 24 jam.

ARAHAN KHUSUS belanjawan:
- Cipta minimum 4 kategori perbelanjaan yang logik berdasarkan jenis program.
- harga_seunit mesti realistik (bukan 0). Agihkan supaya jumlah semua kategori ≈ anggaran_kos.`;

        userPrompt = `Jana kertas kerja LENGKAP dalam format JSON yang ditetapkan. Gantikan semua kemunculan "__PENGARAH__" dengan nama pengarah yang diberikan di bawah.

Input Program:
- Tajuk: ${params.data?.tajuk}
- Jenis Program: ${params.data?.jenisProgram}
- Bentuk Program: ${params.data?.bentukProgram}
- Objektif/Matlamat: ${params.data?.objektif}
- Tarikh: ${params.data?.tarikh}
- Tempat: ${params.data?.tempat}
- Penganjur: ${params.data?.penganjur}
- Bilangan Peserta: ${params.data?.sasaran} orang
- Bilangan Pegawai/AJK: ${params.data?.bilanganPegawai || '5'} orang
- Anggaran Kos Keseluruhan: RM ${params.data?.kos}
- Nama Pengarah Program: ${params.data?.pengarah}${params.data?.ahliJK ? `
- Nama Ahli JK (Optional, sisipkan ke unit yang paling sesuai): ${params.data.ahliJK}` : ''}${params.data?.konteksTambahan ? `

KONTEKS TAMBAHAN DARIPADA PEMOHON (WAJIB DIAMBIL KIRA):
${params.data.konteksTambahan}` : ''}

PERINGATAN MATEMATIK: Agihkan item belanjawan supaya jumlah semua (harga_seunit x kuantiti) ≈ RM ${params.data?.kos}.
Pulangkan JSON sahaja, tiada teks lain.`;
        outputLimit = 8192;
      } else if (params.task === 'jana_minit_mesyuarat') {
        systemInstruction = `Anda adalah Setiausaha Kehormat Profesional berpengalaman 20 tahun yang pakar dalam penulisan minit mesyuarat rasmi Bahasa Melayu. Anda menghasilkan output dalam format JSON murni.

MISI UTAMA (WAJIB DIPATUHI):
Anda BUKAN sekadar menyalin input. Anda MESTI MENGUBAH dan MEMURNIKAN semua input kepada Bahasa Melayu Rasmi yang sempurna, seperti seorang Setiausaha profesional sebenar.

PERATURAN BAHASA (MESTI DIPATUHI 100%):
1. REPHRASE WAJIB: Semua nota/input MESTI ditulis semula dalam ayat Bahasa Melayu Rasmi yang lengkap dan sempurna. JANGAN SEKALI-KALI menyalin input mentah.
2. TATABAHASA: Betulkan semua kesalahan ejaan, tatabahasa, dan ayat tidak lengkap secara automatik.
3. FORMAL: Gunakan kata-kata formal: "perkara", "dibincangkan", "mengemukakan", "mempermaklumkan", "dimaklumkan", "dipersetujui", "sehubungan itu", "dalam hal ini", dsb.
4. BUKAN BAHASA PASAR: Tukar bahasa tidak formal kepada bahasa rasmi yang sesuai secara automatik.
5. AYAT PADAT: Ayat mesti PENDEK dan PADAT (10-20 patah perkataan), tetapi terdengar profesional. Elak ayat panjang berlarat.
6. GUNAKAN IMBUHAN: Ber-, me-, di-, -kan, -an — gunakan dengan betul sesuai konteks.
7. PASIF DOMINAN: Minit mesyuarat menggunakan ayat pasif — "dipersetujui", "dimaklumkan", "dikemukakan", "dinyatakan".

PANDUAN TRANSFORMASI INPUT:
Input kasar -> Output formal (contoh):
- "ydp bising" -> "YDP menyatakan rasa tidak berpuas hati terhadap keadaan semasa."
- "ajk lari dari program" -> "Ahli Jawatankuasa telah meninggalkan program tanpa kebenaran"
- "student complaint kafe tutup" -> "Pelajar melaporkan isu penutupan kafeteria pada waktu pelajar memerlukan perkhidmatan tersebut."
- "surau kunci waktu malam" -> "Surau didapati berkunci pada waktu malam, menyukarkan pelajar untuk bersolat."
- "setiausaha pesan hantar kertas kerja kena ikut format" -> "Setiausaha mengingatkan AJK agar kertas kerja dikemukakan mengikut format yang ditetapkan."

PERATURAN OUTPUT (WAJIB):
1. Pulangkan JSON SAHAJA. TIADA backticks, tiada markdown, tiada teks tambahan.
2. Output mesti bermula dengan { dan berakhir dengan }.
3. Semua nama mesti dalam HURUF BESAR (UPPERCASE).

SKEMA JSON YANG WAJIB DIIKUTI:
{
  "tajuk_mesyuarat": "TAJUK RASMI MESYUARAT",
  "tarikh": "DD/MM/YYYY",
  "masa": "HH.MM Pagi/Petang",
  "platform": "Tempat/Platform",
  "kehadiran": 0,
  "ahli_hadir": [
    { "bil": 1, "nama": "NAMA PENUH HURUF BESAR", "jawatan": "Jawatan (optional)" }
  ],
  "agenda": [
    {
      "bil": 1,
      "tajuk": "UCAPAN ALUAN",
      "sub_perkara": [
        {
          "bil_sub": "1.1",
          "teks": "Setiausaha memulakan mesyuarat dengan bacaan Ummul Kitab Al-Fatihah.",
          "bullet_points": []
        }
      ],
      "tindakan": "Setiausaha"
    }
  ],
  "tandatangan": {
    "disediakan_oleh": {
      "nama": "NAMA SETIAUSAHA",
      "jawatan": "JAWATAN SETIAUSAHA\nJAWATANKUASA PERWAKILAN PELAJAR\nPOLISAS 2026"
    },
    "disahkan_oleh": {
      "nama": "NAMA PENGERUSI/YDP",
      "jawatan": "YANG DI-PERTUA\nJAWATANKUASA PERWAKILAN PELAJAR\nPOLISAS 2026"
    }
  }
}

ARAHAN KHUSUS AGENDA:
- Sertakan sekurang-kurangnya: 1. UCAPAN ALUAN, 2. ALUAN PENGERUSI, 3. PERKARA YANG DIBINCANGKAN (pecah kepada sub 3.1, 3.2...), 4. PENANGGUHAN MESYUARAT
- Setiap sub-perkara: Ayat PENDEK dan padat, formal. BUKAN nota mentah dan BUKAN ayat panjang.
- bullet_points: ayat PENDEK dan padat (10-20 perkataan). Formal dan profesional. Boleh gunakan *teks* untuk penekanan.
- tindakan: "Setiausaha", "Pengerusi", atau jawatan berkaitan

ARAHAN KHUSUS AHLI HADIR:
- Jika senarai nama diberikan, masukkan secara teratur
- Jika hanya bilangan, jana placeholder: { "bil": N, "nama": "(NAMA)" }`;

        userPrompt = `Jana minit mesyuarat LENGKAP dalam format JSON yang ditetapkan.

Maklumat Mesyuarat:
- Tajuk: ${params.data?.tajuk}
- Tarikh: ${params.data?.tarikh || 'Tidak dinyatakan'}
- Masa: ${params.data?.masa || 'Tidak dinyatakan'}
- Platform/Tempat: ${params.data?.platform || 'Tidak dinyatakan'}
- Nama Setiausaha: ${params.data?.namaSetiausaha || '(NAMA SETIAUSAHA)'}
- Nama Pengerusi/YDP: ${params.data?.namaPengerusi || '(NAMA PENGERUSI)'}
- Senarai Ahli Hadir:\n${params.data?.senaraIHadir || 'Bilangan: ' + (params.data?.kehadiran || 0) + ' orang'}

Nota Mesyuarat / Perkara Dibincangkan:\n${params.data?.nota || '(tiada nota teks diberikan)'}\n${(params.data?.images?.length > 0) ? '\nPENTING: Gambar catatan/papan putih telah dilampirkan. BACA dan EKSTRAK semua maklumat daripada gambar tersebut dan masukkan sebagai sub-perkara atau bullet_points dalam agenda.' : ''}\n\nINGATAN: Pulangkan JSON sahaja mengikut skema yang ditetapkan.`;
        outputLimit = 6000;

      } else if (params.task === 'custom_query') {
        systemInstruction = "Anda adalah Nexus AI, enjin kecerdasan buatan rasmi bagi Portal JPP POLISAS. Nama anda 'Nexus AI' melambangkan peranan anda sebagai pusat integrasi data dan bantuan pintar untuk warga POLISAS. Anda HANYA DIBENARKAN untuk menjawab hal-hal berkaitan kelab, persatuan, dokumentasi aktiviti, dan maklumat kampus POLISAS. Jika subjek di luar skop ini, tolak dengan sopan. PERATURAN TERMINOLOGI: JANGAN sebut 'Laporan Aktiviti', gunakan 'Laporan Bulanan' sahaja.\n\nARAHAN WAJIB (STRICT): Anda mesti merumuskan jawapan kepada yang SANGAT PENDEK, mesra, dan santai. JANGAN berikan jawapan panjang lebar melainkan jika betul betul mendesak";
        userPrompt = `Pertanyaan Pelajar: ${params.query}`;
        outputLimit = 700;

      } else if (params.task === 'suggest_program') {
        systemInstruction = "Anda adalah Pegawai Hal Ehwal Pelajar JPP POLISAS yang kreatif and berpengalaman dalam menganjurkan program berkualiti untuk pelajar politeknik.";
        userPrompt = `Cadangkan LIMA (5) idea program atau aktiviti pelajar yang menarik, praktikal, dan berimpak tinggi untuk kelab/persatuan di POLISAS.\n\nFokus Utama: ${params.data?.fokus || 'Meningkatkan perpaduan dan penglibatan aktif pelajar'}\n\n[FORMAT WAJIB — gunakan Markdown]\nUntuk setiap cadangan, nyatakan:\n- **Nama Program** (pendek & menarik)\n- Objektif ringkas (1 ayat)\n- Cadangan tarikh/tempoh\n\nJawab dalam Bahasa Melayu yang mesra dan profesional.${params.concise ? '\n\nMOD RINGKAS: Sila berikan 3 idea sahaja dengan penerangan 1 ayat bagi setiap satu.' : ''}`;
        outputLimit = params.concise ? 600 : 1500;

      } else {
        systemInstruction = "Anda adalah pembantu AI integrasi JPP POLISAS.";
        userPrompt = `Selesaikan tugas: ${params.task} berasaskan data berikut: ${JSON.stringify(params.data || {})}`;
      }

      // Penentuan model: Chat dan Semak Ejaan guna 1.5-flash untuk kestabilan, yang lain guna 2.5-flash
      let modelEndpointString = 'gemini-2.5-flash'; // Pintar & Berkuasa (Default untuk Kertas Kerja/Analisis)
      // selectedModel boleh datang dari params.selectedModel (kertas kerja) atau params.data.selectedModel (minit mesyuarat)
      const effectiveModel = params.selectedModel || params.data?.selectedModel;
      if (effectiveModel === 'pro') {
        modelEndpointString = 'gemini-1.5-pro';
      } else if (params.task === 'semak_tatabahasa_laporan' || params.task === 'custom_query') {
        modelEndpointString = 'gemini-2.5-flash-lite'; // Pantas & Jimat (Untuk Chat/Grammar)
      }

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

      // Tasks that require strict JSON output — enforce responseMimeType
      const isJsonTask = params.task === 'jana_minit_mesyuarat' || params.task === 'jana_kertas_kerja';

      const requestBody = JSON.stringify({
        system_instruction: { parts: [{ text: systemInstruction }] },
        contents: [{ parts: contentsParts }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: outputLimit,
          topP: 0.9,
          ...(isJsonTask ? { responseMimeType: 'application/json' } : {}),
        },
      });

      let responseData;
      let attempt = 0;
      const maxRetries = 3;

      while (attempt < maxRetries) {
        try {
          if (attempt > 0) {
            setRetryCount(attempt);
            await new Promise(res => setTimeout(res, attempt * 2000));
          }

          const { data, error } = await invokeLocalApi('ai-assistant', {
            body: { action: 'proxy', endpoint, payload: JSON.parse(requestBody) }
          });
          
          if (error) {
             throw new Error(error.message || "Gagal menghubungi Edge Function AI.");
          }
          
          if (data.status && data.status !== 200) {
            const errorMsg = data.error?.message || `Google API Error: ${data.status}`;
            
            if (errorMsg.toLowerCase().includes("high demand") || data.status === 503) {
              console.warn(`Model ${modelEndpointString} is overloaded. Falling back to gemini-2.5-flash-lite...`);
              const fallbackEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent`;
              
              const { data: data2, error: error2 } = await invokeLocalApi('ai-assistant', {
                body: { action: 'proxy', endpoint: fallbackEndpoint, payload: JSON.parse(requestBody) }
              });
              
              if (error2) throw new Error(error2.message || "Gagal menghubungi Edge Function AI (Fallback).");
              if (data2.status && data2.status !== 200) {
                 throw new Error(data2.error?.message || `Google API Error (Fallback): ${data2.status}`);
              }
              responseData = data2;
            } else {
               throw new Error(errorMsg);
            }
          } else {
             responseData = data;
          }
          setRetryCount(0);
          break; // success
        } catch (apiError: any) {
          const apiErrorMsg = apiError.message || String(apiError);
          // Don't retry auth/policy/flagged errors
          if (apiErrorMsg.includes('API key') || apiErrorMsg.includes('Sila konfigurasikan')) {
            throw apiError;
          }
          
          attempt++;
          if (attempt >= maxRetries) {
            setRetryCount(0);
            throw apiError;
          }
          console.warn(`AI Retry ${attempt}/${maxRetries} failed:`, apiErrorMsg);
        }
      }

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
      } else if (params.task === 'jana_minit_mesyuarat') {
        spendKey = params.data?.selectedModel === 'pro' ? 'pro_minit_mesyuarat' : 'flash_minit_mesyuarat';
      } else if (params.task === 'semak_tatabahasa_laporan') {
        spendKey = 'semak_ejaan';
      } else if (params.task === 'analyze_performance' || params.task === 'review_kertas_kerja') {
        spendKey = 'analisis';
      }
      
      if (spendKey) {
         await supabase.rpc('spend_ai_tokens', { task_name: spendKey });
      }

      // Track real Google API token consumption (fire-and-forget)
      const googleTokens = responseData?.usageMetadata?.totalTokenCount;
      if (googleTokens && googleTokens > 0) {
        void (async () => {
          try { await supabase.rpc('increment_ai_google_tokens', { tokens_used: googleTokens }); }
          catch (err) { console.warn('[Nexus] Token tracking failed:', err); }
        })();
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
        toast.error(`Sistem AI Terganggu: ${errorMsg.includes('429') ? 'Had kuota tamat' : 'Sila cuba lagi'}`);

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
    history: ChatMessage[],
    context?: ChatContext
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

      // Security: VITE_GEMINI_API_KEY removed from frontend. Request proxied through Edge Function.

      // STATIC SYSTEM PROMPT - Identical for all users (Gemini implicit caching)
      // Gemini auto-caches this prefix at 90% discount ($0.01/1M vs $0.10/1M)
      const staticSystemPrompt = [
        'Anda Nexus AI, pembantu rasmi Portal JPP POLISAS.',
        'Persona: Mesra, proaktif, BM santai/rojak. JANGAN robotik. JANGAN perkenal diri. Jawab PENDEK.',
        'Terminologi: "Laporan Aktiviti" DB mesti dipanggil "Laporan Bulanan".',
        'Token: Chat/Tatabahasa=Free|Analisis=5|KerjaFlash=20|Pro=50. Baki di konteks.',
        'E-Keusahawanan: Mohon>Lulus>POS>Pekerja>Syif>Stat.',
        'Takwim: Rujuk konteks. JANGAN reka.',
        'Privasi: JANGAN dedah info kelab lain.',
        'Anti-rekaan: JANGAN reka fakta.',
        'Navigasi: Guna [NAVIGATE:/laluan]. Sah: /, /aktiviti, /akademik, /keusahawanan, /keusahawanan/pos, /kebajikan, /polymart, /polymaps, /polyrider, /jpp'
      ].join('\n');

      // Build valid history first to use it for context keyword matching
      // Cap at 6 messages (3 turns) for heavy memory savings (Adaptive History Truncation)
      const validHistory = history
        .filter((m) => m.role === 'user' || m.role === 'ai')
        .reduce((acc, msg) => {
          if (acc.length > 0 && acc[acc.length - 1].role === msg.role) {
            acc[acc.length - 1] = msg; // merge consecutive same-role
          } else {
            acc.push(msg);
          }
          return acc;
        }, [])
        .slice(-6);

      // --- CLIENT-SIDE RAG (Keyword Routing) ---
      // Combine user text and recent history to decide if we need to inject heavy context
      const searchString = (userText + ' ' + validHistory.slice(-2).map(m => m.content).join(' ')).toLowerCase();
      
      const takwimKeywords = ['takwim', 'jadual', 'program', 'cuti', 'aktiviti', 'bila', 'tarikh', 'esok', 'lusa', 'minggu depan', 'bulan depan', 'sem ', 'semester', 'exam', 'peperiksaan', 'daftar', 'pendaftaran', 'perayaan', 'sukan'];
      const clubsKeywords = ['kelab', 'persatuan', 'senarai', 'sukan', 'nama', 'join', 'masuk', 'sertai'];
      const jppKeywords = ['jpp', 'exco', 'majlis tertinggi', 'presiden', 'organisasi', 'struktur', 'biro', 'tugas', 'siapa', 'wakil', 'mpp'];

      const needsTakwim = takwimKeywords.some(kw => searchString.includes(kw));
      const needsClubs = clubsKeywords.some(kw => searchString.includes(kw));
      const needsJppOrg = jppKeywords.some(kw => searchString.includes(kw));

      // DYNAMIC CONTEXT - per-user, per-session (injected into contents[0])
      const dynamicContextParts = [];
      if (context?.currentPage) dynamicContextParts.push(`Halaman semasa: ${context.currentPage}`);
      if (context?.clubInfo) dynamicContextParts.push(`Kelab: ${context.clubInfo.name} (${context.clubInfo.membersCount || '0'} ahli)`);
      if (context?.recentNotifications?.length) dynamicContextParts.push(`Notifikasi: ${context.recentNotifications.join('; ')}`);
      if (context?.tokenBalance !== undefined) dynamicContextParts.push(`Baki Token: ${context.tokenBalance} | Tahap: ${context?.subscriptionTier?.toUpperCase() ?? 'FREE'}`);
      if (context?.committee) dynamicContextParts.push(`Kepimpinan kelab:\n${context.committee}`);
      if (context?.pendingTasksCount) dynamicContextParts.push(`Tugasan aktif: ${context.pendingTasksCount}`);
      if (context?.akademikInfo) dynamicContextParts.push(`[E-Akademik] CGPA: ${context.akademikInfo.cgpa?.toFixed(2) || 'Tiada'} | Merit: ${context.akademikInfo.meritPoints || 0} | Fail: ${context.akademikInfo.statusUnlock || 'Tiada'}`);
      
      // Heavy payloads - only inject if keywords matched
      if (needsJppOrg && context?.jppOrganization) dynamicContextParts.push(`Organisasi JPP:\n${context.jppOrganization}`);
      if (needsClubs && context?.allClubs) dynamicContextParts.push(`Senarai kelab:\n${context.allClubs}`);
      if (needsTakwim && context?.upcomingPrograms) dynamicContextParts.push(`Program akan datang:\n${context.upcomingPrograms}`);

      if (context?.keusahawananInfo) {
        const ki = context.keusahawananInfo;
        dynamicContextParts.push(`[E-Keusahawanan] Kedai: ${ki.shopName || 'Tiada'} | Pengurus: ${ki.isManager ? 'Ya' : 'Tidak'} | Syif: ${ki.activeShifts || 'Tiada'} | Jualan: ${ki.todaySales !== undefined ? 'RM' + ki.todaySales.toFixed(2) : '-'} | Stok rendah: ${ki.lowStockCount || 0}`);
      }
      if (context?.jppHqInfo) dynamicContextParts.push(`[HQ JPP] Laporan pending: ${context.jppHqInfo.totalPendingReports || 0} | Merit pending: ${context.jppHqInfo.totalMeritPending || 0}`);
      if (context?.kebajikanInfo) {
        const kb = context.kebajikanInfo;
        dynamicContextParts.push(`[Kebajikan] Peranan: ${kb.role}${kb.role === 'PELAJAR' ? ` | Tiket aktif: ${kb.activeTicketsCount || 0}` : ` | Urgent: ${kb.urgentTicketsUnresolved || 0} | Assigned: ${kb.assignedToMe || 0}`}`);
      }
      if (context?.polymartInfo) dynamicContextParts.push(`[PolyMart] ${context.polymartInfo.userType} | Beli aktif: ${context.polymartInfo.activePurchases || 0} | Masuk: ${context.polymartInfo.pendingIncomingOrders || 0}`);
      
      // Heavy Payload - Takwim
      if (needsTakwim && context?.takwimInfo) {
        const ti = context.takwimInfo;
        const tParts = [`[Takwim] Akses: ${ti.accessScope === 'JPP_FULL' ? 'JPP Penuh' : 'Pelajar'} | Akan datang: ${ti.totalUpcoming || 0}`];
        if (ti.upcomingEvents) tParts.push(`Aktiviti:\n${ti.upcomingEvents}`);
        if (ti.upcomingCuti) tParts.push(`Cuti:\n${ti.upcomingCuti}`);
        if (ti.pastEvents) tParts.push(`Lepas:\n${ti.pastEvents}`);
        if (ti.clubPrograms) tParts.push(`Program ${ti.clubProgramsName || 'Kelab'}:\n${ti.clubPrograms}`);
        dynamicContextParts.push(tParts.join('\n'));
      }
      
      if (context?.PolyMapsInfo) {
        const im = context.PolyMapsInfo;
        if (im.isNavigating && im.activeBuildingName) {
          dynamicContextParts.push(`[PolyMaps] Navigasi ke: ${im.activeBuildingName}${im.targetRoomCode ? ' Bilik: ' + im.targetRoomCode : ''}`);
        } else if (im.activeBuildingName) {
          dynamicContextParts.push(`[PolyMaps] Bangunan: ${im.activeBuildingName}${im.activeBuildingZone ? ' Zon: ' + im.activeBuildingZone : ''}${im.facilityStatus ? ' (' + im.facilityStatus + ')' : ''}`);
        }
      }
      if (context?.polyRiderInfo) {
        const pr = context.polyRiderInfo;
        const prParts = [`[PolyRider] ${pr.userType}`];
        if (pr.userType === 'RIDER') {
          prParts.push(`Status: ${pr.riderStatus || '?'} | Pendapatan: RM${(pr.todayEarnings || 0).toFixed(2)}`);
          if (pr.activeJobRiderStatus) prParts.push(`Trip: ${pr.activeJobRiderPickup || '?'} > ${pr.activeJobRiderDropoff || '?'} (${pr.activeJobRiderStatus})`);
        } else if (pr.userType === 'PASSENGER' && pr.activeJobStatus) {
          prParts.push(`Trip: ${pr.activeJobPickup || '?'} > ${pr.activeJobDropoff || '?'} (${pr.activeJobStatus})`);
          if (pr.activeBidsCount) prParts.push(`${pr.activeBidsCount} bidaan menunggu`);
        }
        dynamicContextParts.push(prParts.join(' | '));
      }

      const dynamicContext = dynamicContextParts.join('\n');

      const contents = [
        ...(dynamicContext ? [
          { role: 'user', parts: [{ text: `[KONTEKS SESI]\n${dynamicContext}` }] },
          { role: 'model', parts: [{ text: 'Faham, saya sedia membantu.' }] },
        ] : []),
        ...validHistory.map((m) => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.content }],
        })),
        { role: 'user', parts: [{ text: userText }] },
      ];
      const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent';
      let responseData;
      let attempt = 0;
      const maxRetries = 3;

      while (attempt < maxRetries) {
        try {
          if (attempt > 0) {
            setRetryCount(attempt);
            await new Promise(res => setTimeout(res, attempt * 2000));
          }

          const { data, error } = await invokeLocalApi('ai-assistant', {
            body: {
              action: 'proxy',
              endpoint: endpoint,
              payload: {
                system_instruction: { parts: [{ text: staticSystemPrompt }] },
                contents,
                generationConfig: { temperature: 0.3, maxOutputTokens: 800, topP: 0.85 }
              }
            }
          });

          if (error) {
             throw new Error(error.message || "Gagal menghubungi Edge Function AI.");
          }
          if (data.status && data.status !== 200) {
             throw new Error(data.error?.message || `Google API Error: ${data.status}`);
          }
          responseData = data;
          setRetryCount(0);
          break; // success
        } catch (apiError: any) {
          const apiErrorMsg = apiError.message || String(apiError);
          // Don't retry critical errors
          if (apiErrorMsg.includes('API key')) {
            throw apiError;
          }
          
          attempt++;
          if (attempt >= maxRetries) {
            setRetryCount(0);
            throw apiError;
          }
          console.warn(`Chat AI Retry ${attempt}/${maxRetries} failed:`, apiErrorMsg);
        }
      }
      const finishReason = responseData?.candidates?.[0]?.finishReason;
      if (finishReason === 'SAFETY') {
        throw new Error('Mesej anda telah disekat kerana mengandungi elemen yang tidak mematuhi Polisi Keselamatan JPP/Google.');
      }

      const text = responseData?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('Maklumbalas AI kosong atau tidak sah.');

      // === LOG PENGGUNAAN CHAT UNTUK AUDIT (DEEP ANALYSIS) ===
      await supabase.rpc('spend_ai_tokens', { task_name: 'chat' });

      // Track real Google API token consumption (fire-and-forget)
      const googleTokens = responseData?.usageMetadata?.totalTokenCount;
      if (googleTokens && googleTokens > 0) {
        void (async () => {
          try { await supabase.rpc('increment_ai_google_tokens', { tokens_used: googleTokens }); }
          catch (err) { console.warn('[Nexus] Token tracking failed:', err); }
        })();
      }

      return text;

    } catch (e: any) {
      console.error('Chat AI Error:', e);
      const errorMsg = e.message || String(e);
      if (errorMsg.includes('digantung') || errorMsg.includes('kekal')) {
        toast.error(errorMsg, { duration: 5000 });
      } else if (errorMsg.includes('Polisi Keselamatan')) {
        toast.error(errorMsg);
      } else {
        toast.error(`Sistem AI Terganggu: ${errorMsg.includes('429') ? 'Had kuota tamat' : 'Sila cuba lagi'}`);
      }
      return null;
    } finally {
      setIsChatLoading(false);
    }
  };

  // ─── Dedicated AI function for Kebajikan Exco ──────────────────────────────
  const sendKebajikanExcoMessage = async (
    userText: string,
    history: ChatMessage[],
    context?: ChatContext
  ): Promise<string | null> => {
    setIsChatLoading(true);
    try {
      // Security check (0 token cost for Exco chat)
      const { error: usageError } = await supabase.rpc('check_ai_tokens', { task_name: 'chat' });
      if (usageError?.message?.includes('digantung') || usageError?.message?.includes('kekal')) {
        throw new Error(usageError.message);
      }

      // Security: VITE_GEMINI_API_KEY removed from frontend. Request proxied through Edge Function.

      // ─ Build live context block ──────────────────────────────────────────────
      const kb = context?.kebajikanInfo;
      const contextLines: string[] = [];
      if (kb) {
        contextLines.push('== DATA OPERASI SEMASA (DIKEMASKINI SEMASA SESI DIMULAKAN) ==');
        if (kb.slaConfig)                  contextLines.push(`Konfigurasi SLA: ${kb.slaConfig}`);
        if (kb.urgentTicketsUnresolved !== undefined) contextLines.push(`Jumlah Tiket Urgent (NEW + ESCALATED + REOPENED): ${kb.urgentTicketsUnresolved}`);
        if (kb.totalWarning !== undefined) contextLines.push(`Tiket dalam status WARNING: ${kb.totalWarning}`);
        if (kb.totalEscalated !== undefined) contextLines.push(`Tiket dalam status ESCALATED: ${kb.totalEscalated}`);
        if (kb.unassignedCount !== undefined) contextLines.push(`Tiket tanpa tugasan (Unassigned): ${kb.unassignedCount}`);
        if (kb.resolvedThisWeek !== undefined) contextLines.push(`Tiket diselesaikan minggu ini: ${kb.resolvedThisWeek}`);
        if (kb.topCategoryThisMonth)       contextLines.push(`Kategori aduan terbanyak bulan ini: ${kb.topCategoryThisMonth}`);
        if (kb.urgentTicketsList)          contextLines.push(`\nSenarai Tiket Urgent (tertua dahulu):\n${kb.urgentTicketsList}`);
        if (kb.assignedToMe !== undefined) contextLines.push(`\nTiket ditugaskan kepada anda: ${kb.assignedToMe}`);
        if (kb.assignedToMeList)           contextLines.push(`Senarai tugasan anda:\n${kb.assignedToMeList}`);
        if (kb.currentTicket) {
          contextLines.push('');
          contextLines.push('== TIKET SEMASA DI SKRIN EXCO ==');
          contextLines.push('Exco sedang melihat tiket berikut secara langsung:');
          contextLines.push(kb.currentTicket);
          contextLines.push('Apabila Exco meminta pendapat, fokus kepada tiket ini secara spesifik.');
        }
      } // end if (kb)

      const systemInstruction = [
        // ── IDENTITY ──────────────────────────────────────────────────────────
        'Anda adalah pembantu peribadi pintar untuk Exco Kebajikan POLISAS. Anggap diri anda macam kawan rapat yang tahu semua pasal sistem e-Kebajikan — boleh bagi pendapat, cadangan, dan bantuan tanpa perlu bersopan-santun lebih.',
        '',
        // ── WHO IS THE USER ────────────────────────────────────────────────────
        'Pengguna anda = Exco Kebajikan atau Admin. Mereka busy, tak ada masa nak baca esei. Berikan jawapan yang terus kepada point.',
        context?.currentPage ? `Halaman semasa: ${context.currentPage}` : '',
        '',
        // ── SYSTEM KNOWLEDGE (compact) ─────────────────────────────────────────
        'Status tiket: NEW (baru masuk), IN_PROGRESS (sedang diurus), WARNING (hampir exceed SLA), ESCALATED (dah exceed SLA, kritikal!), RESOLVED (tunggu pengesahan pelajar), CLOSED (selesai), REOPENED (pelajar tak puas hati), CANCELLED.',
        'Kategori: FASILITI, KESELAMATAN, KEWANGAN, AKADEMIK, KEBAJIKAN.',
        '',
        // ── LIVE DATA ─────────────────────────────────────────────────────────
        contextLines.join('\n'),
        '',
        // ── PERSONALITY & TONE ────────────────────────────────────────────────
        'CARA ANDA BERCAKAP:',
        '- Macam kawan yang bijak — direct, jujur, no nonsense',
        '- BM santai bila borak, BM formal bila nak draf surat/dokumen',
        '- Boleh guna singkatan biasa (tak payah tulis "Adalah dimaklumkan bahawa...")',
        '- Kalau ada data dari context, terus sebut — jangan tanya balik benda yang AI dah tahu',
        '- Kalau minta pendapat, bagi pendapat SEBENAR. Jangan "bergantung kepada situasi"',
        '',
        // ── STRICT LENGTH RULES ───────────────────────────────────────────────
        'PANJANG JAWAPAN — INI PALING PENTING:',
        '- Soalan pendek / biasa → jawab dalam 1 hingga 3 ayat SAHAJA. Habis.',
        '- Analisis / pendapat → max 4-5 bullet point pendek. Tiada intro panjang.',
        '- Draf surat / laporan rasmi → barulah boleh panjang.',
        '- JANGAN gunakan header (##, **Bahagian 1**, dll) dalam perbualan biasa.',
        '- JANGAN ulang soalan pengguna sebelum jawab.',
        '- JANGAN tulis "Berdasarkan data yang diberikan..." atau frasa AI klise lain.',
        '',
        // ── EXAMPLES (few-shot guide) ─────────────────────────────────────────
        'CONTOH JAWAPAN YANG BETUL:',
        'Soalan: "Ada berapa tiket urgent?"  →  "3 tiket — 2 ESCALATED, 1 REOPENED. Yang paling lama dah 72 jam. Nak saya list sekali?"',
        'Soalan: "Macam mana nak resolve tiket wifi ni?"  →  "Kemungkinan besar router overload atau coverage issue. Steps: (1) Hubungi IT/BTMK, (2) Minta nombor work order, (3) Update status jadi IN_PROGRESS dulu. Nak saya draf emel ke IT?"',
        'Soalan: "Apa pendapat kau pasal tiket ni?"  →  "Rasanya ni kes yang boleh settle dalam 24 jam kalau assign terus ke Fasiliti. Tapi kalau dah masuk ESCALATED, perlu buat nota rasmi dulu."',
        '',
        // ── SCOPE ─────────────────────────────────────────────────────────────
        'Boleh bantu apa sahaja yang Exco perlukan — sistem, draf surat, pendapat, nasihat am. Tiada sekatan topik.',
      ].filter(Boolean).join('\n');

      // Build conversation history (allow 16 messages = 8 turns for Exco)
      const validHistory = history
        .filter(m => m.role === 'user' || m.role === 'ai')
        .reduce<ChatMessage[]>((acc, msg) => {
          if (acc.length > 0 && acc[acc.length - 1].role === msg.role) {
            acc[acc.length - 1] = msg;
          } else {
            acc.push(msg);
          }
          return acc;
        }, [])
        .slice(-16);

      const contents = [
        ...validHistory.map(m => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.content }],
        })),
        { role: 'user', parts: [{ text: userText }] },
      ];

      const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
      let responseData;
      let attempt = 0;
      const maxRetries = 3;

      while (attempt < maxRetries) {
        try {
          if (attempt > 0) {
            setRetryCount(attempt);
            await new Promise(res => setTimeout(res, attempt * 2000));
          }

          const { data, error } = await invokeLocalApi('ai-assistant', {
            body: {
              action: 'proxy',
              endpoint: endpoint,
              payload: {
                system_instruction: { parts: [{ text: systemInstruction }] },
                contents,
                generationConfig: { temperature: 0.7, maxOutputTokens: 1200, topP: 0.9 }
              }
            }
          });

          if (error) {
             throw new Error(error.message || "Gagal menghubungi Edge Function AI.");
          }
          
          if (data.status && data.status !== 200) {
            const errorMsg = data.error?.message || `Google API Error: ${data.status}`;
            if (errorMsg.toLowerCase().includes('high demand') || data.status === 503) {
              const fallbackEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent`;
              const { data: data2, error: error2 } = await invokeLocalApi('ai-assistant', {
                body: { action: 'proxy', endpoint: fallbackEndpoint, payload: { system_instruction: { parts: [{ text: systemInstruction }] }, contents, generationConfig: { temperature: 0.7, maxOutputTokens: 1200, topP: 0.9 } } }
              });
              if (error2) throw new Error(error2.message || `Fallback error: Edge function failure`);
              if (data2.status && data2.status !== 200) throw new Error(data2.error?.message || `Fallback error: ${data2.status}`);
              responseData = data2;
              setRetryCount(0);
              break;
            }
            throw new Error(errorMsg);
          }
          responseData = data;
          setRetryCount(0);
          break;
        } catch (apiError: any) {
          const apiErrorMsg = apiError.message || String(apiError);
          if (apiErrorMsg.includes('API key')) throw apiError;
          attempt++;
          if (attempt >= maxRetries) { setRetryCount(0); throw apiError; }
          console.warn(`Kebajikan Exco AI Retry ${attempt}/${maxRetries}:`, apiErrorMsg);
        }
      }

      const finishReason = responseData?.candidates?.[0]?.finishReason;
      if (finishReason === 'SAFETY') {
        throw new Error('Mesej anda telah disekat kerana mengandungi elemen yang tidak mematuhi Polisi Keselamatan.');
      }

      const text = responseData?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('Maklumbalas AI kosong atau tidak sah.');

      // Log usage (0 token cost — Exco chat is free)
      await supabase.rpc('spend_ai_tokens', { task_name: 'chat' });

      // Track real Google API token consumption (fire-and-forget)
      const googleTokensExco = responseData?.usageMetadata?.totalTokenCount;
      if (googleTokensExco && googleTokensExco > 0) {
        void (async () => {
          try { await supabase.rpc('increment_ai_google_tokens', { tokens_used: googleTokensExco }); }
          catch (err) { console.warn('[Nexus] Token tracking failed:', err); }
        })();
      }

      return text;

    } catch (e: any) {
      console.error('Kebajikan Exco AI Error:', e);
      const errorMsg = e.message || String(e);
      if (errorMsg.includes('digantung') || errorMsg.includes('kekal')) {
        toast.error(errorMsg, { duration: 5000 });
      } else if (errorMsg.includes('Polisi Keselamatan')) {
        toast.error(errorMsg);
      } else {
        toast.error(`Sistem AI Terganggu: ${errorMsg.includes('429') ? 'Had kuota tamat' : 'Sila cuba lagi'}`);
      }
      return null;
    } finally {
      setIsChatLoading(false);
    }
  };

  return { callAi, sendChatMessage, sendKebajikanExcoMessage, isLoading, isChatLoading, retryCount, result, setResult };
}


