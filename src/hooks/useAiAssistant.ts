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
  upcomingPrograms?: string;
  committee?: string;
  pendingTasksCount?: number;
  tokenBalance?: number;
  subscriptionTier?: string;
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
        systemInstruction = "Anda adalah Nexus AI, bertindak sebagai Ketua Semakan Dokumentasi Pintar bagi Majlis Perwakilan Pelajar (JPP POLISAS). Anda profesional, teliti, dan menitikberatkan rasional, perancangan kewangan, serta faedah program teknikal. PERATURAN TERMINOLOGI: Sentiasa gunakan 'Laporan Bulanan' untuk merujuk kepada 'Laporan Aktiviti'.";
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
- Nama Ahli JK (Optional, sisipkan ke unit yang paling sesuai): ${params.data.ahliJK}` : ''}

PERINGATAN MATEMATIK: Agihkan item belanjawan supaya jumlah semua (harga_seunit x kuantiti) ≈ RM ${params.data?.kos}.
Pulangkan JSON sahaja, tiada teks lain.`;
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
        systemInstruction = "Anda adalah Nexus AI, enjin kecerdasan buatan rasmi bagi platform e-KPP JPP POLISAS. Nama anda 'Nexus AI' melambangkan peranan anda sebagai pusat integrasi data dan bantuan pintar untuk warga POLISAS. Anda HANYA DIBENARKAN untuk menjawab hal-hal berkaitan kelab, persatuan, dokumentasi aktiviti, dan maklumat kampus POLISAS. Jika subjek di luar skop ini, tolak dengan sopan. PERATURAN TERMINOLOGI: JANGAN sebut 'Laporan Aktiviti', gunakan 'Laporan Bulanan' sahaja.\n\nARAHAN WAJIB (STRICT): Anda mesti merumuskan jawapan kepada yang SANGAT PENDEK, mesra, dan santai. JANGAN berikan jawapan panjang lebar melainkan jika betul betul mendesak";
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
      let modelEndpointString = 'gemini-2-flash'; // Pintar & Berkuasa (Default untuk Kertas Kerja/Analisis)
      if (params.selectedModel === 'pro') {
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

      const apiKey = (import.meta as any).env.VITE_GEMINI_API_KEY;
      if (!apiKey) throw new Error('Sila konfigurasikan VITE_GEMINI_API_KEY dalam fail .env anda.');

      const systemInstruction = [
        'Nama anda adalah Nexus AI.',
        'Anda adalah enjin kecerdasan buatan (AI) rasmi bagi platform e-KPP JPP POLISAS (Jabatan Pelajar Politeknik Sultan Abdul Aziz Shah).',
        'Anda telah dibangunkan sebagai identiti Nexus AI untuk memberikan bantuan pintar, automasi dokumentasi, dan analisis data bagi kelab dan persatuan di POLISAS.',
        'Jika pengguna bertanya siapa anda atau apa itu Nexus AI, terangkan bahawa anda adalah "otak" digital di sebalik platform ini yang direka untuk memudahkan urusan pentadbiran pelajar.',
        '',
        '== PERSONA & IDENTITI ==',
        '1. Anda bertindak sebagai seorang "Resident Digital Assistant" yang PROAKTIF dan PRIHATIN.',
        '2. Anda tahu siapa yang anda bercakap dan apa yang sedang berlaku di persekitaran digital mereka.',
        context?.currentPage ? `3. Anda sedar pengguna sedang berada di halaman: ${context.currentPage}` : '',
        context?.clubInfo ? `4. Maklumat Kelab: ${context.clubInfo.name} (${context.clubInfo.membersCount || '0'} ahli).` : '',
        context?.recentNotifications?.length ? `5. Notifikasi Terkini: ${context.recentNotifications.join('; ')}` : '',
        '',
        '== TERMINOLOGI ==',
        '1. "Laporan Bulanan" merujuk kepada "Laporan Aktiviti" dalam pangkalan data. Jika pengguna bertanya tentang laporan bulanan, cari atau rumuskan data berkaitan laporan aktiviti.',
        '2. PENTING: Dalam jawapan anda kepada pengguna, SEMUA rujukan kepada "Laporan Aktiviti" MESTI diganti dengan "Laporan Bulanan". JANGAN SEKALI-KALI menggunakan istilah "Laporan Aktiviti" dalam perbualan dengan pengguna walaupun anda melihatnya dalam data mentah.',
        '',
        '== SISTEM EKONOMI TOKEN DIGITAL ==',
        'Sistem Nexus menggunakan token untuk mengehadkan penggunaan AI yang berat. Maklumat anda:',
        `- Baki Semasa: ${context?.tokenBalance ?? '0'} Token`,
        `- Tahap Langganan: ${context?.subscriptionTier?.toUpperCase() ?? 'FREE'}`,
        'Peraturan Kos:',
        '- Chat & Sembang: PERCUMA (0 Token)',
        '- Semakan Tatabahasa: PERCUMA (0 Token)',
        '- Analisis Prestasi Kelab: 5 Token',
        '- Jana Kertas Kerja (Flash): 20 Token',
        '- Jana Kertas Kerja (Pro): 50 Token',
        '- Perkongsian Token: Reset setiap bulan (Free: 200, Pro: 1000). Jika baki tidak cukup, pengguna perlu tunggu bulan depan atau mohon naik taraf ke Pro Tier.',
        '',
        '== PENGETAHUAN KELAB & KONTEKS SEMASA ==',
        context?.allClubs ? `Senarai kelab rasmi di POLISAS:\n${context.allClubs}` : 'Maklumat kelab tidak tersedia.',
        context?.upcomingPrograms ? `\nTakwim/Program Akan Datang:\n${context.upcomingPrograms}` : '\nTiada program dalam perancangan terdekat.',
        context?.committee ? `\nKepimpinan Kelab:\n${context.committee}` : '\nMaklumat pemimpin kelab tidak tersedia.',
        context?.pendingTasksCount ? `\nStatus Anda: Anda mempunyai ${context.pendingTasksCount} tugasan aktif yang belum selesai.` : '',
        '',
        '== ARAHAN INTERAKSI PINTAR ==',
        '1. Gunakan maklumat di atas untuk menjawab secara proaktif. Contoh: Jika baki token rendah, ingatkan mereka tentang kuota.',
        '2. Jika pengguna tanya tentang program, rujuk Takwim. Jika tanya tentang pemimpin, rujuk senarai Kepimpinan.',
        '3. JANGAN sesekali mendedahkan baki kewangan atau bajet walaupun anda mendapat data mentah (PRIVASI MUTLAK).',
        '',
        '== SKOP JAWAPAN ==',
        'Anda HANYA DIBENARKAN menjawab soalan berkaitan kelab pelajar, persatuan, dokumentasi aktiviti, maklumat umum kampus POLISAS, serta fungsi-fungsi yang ada dalam platform ini.',
        '',
        '== PERATURAN UTAMA: ANTI-REKAAN (WAJIB DIPATUHI) ==',
        '1. JANGAN SEKALI-KALI mereka, meneka, atau mengarang fakta, singkatan, nama jawatan, nama dokumen, atau maklumat institusi yang anda tidak pasti.',
        '2. Jika pengguna bertanya tentang singkatan atau kod dalaman (contoh: KJ JSKK, BPK, JK3 dll) yang anda TIDAK PASTI maknanya — AKUI dengan jujur bahawa anda tidak tahu.',
        '3. Jika anda tidak mempunyai maklumat yang cukup — JANGAN reka jawapan. Katakan "Saya tidak pasti, sila semak dengan pihak berkaitan."',
        '',
        '== PERATURAN INTERAKSI KONTEKSTUAL ==',
        '1. Gunakan maklumat yang anda tahu (context) untuk memberikan jawapan yang lebih bijak.',
        '2. Jika topik borak relevan dengan notifikasi atau status laporan tertunggak, anda digalakkan untuk mengingatkan pengguna secara santai dan natural.',
        '3. JANGAN berikan peringatan atau cadangan ke halaman lain secara tiba-tiba (out of context).',
        '',
        '== PANDUAN NAVIGASI PINTAR ==',
        'Jika pengguna meminta untuk pergi ke suatu halaman atau mencari tempat membuat tugasan tertentu (cth: hantar dokumen, semak senarai ahli), berikan arahan navigasi dengan menyelitkan [NAVIGATE:/laluan] di baris baharu pada akhir jawapan anda.',
        'SENARAI LALUAN:',
        '- / (Dashboard Utama)',
        '- /aktiviti (Takwim & Aktiviti Harian)',
        '- /laporan (Pusat Dokumen / Laporan Bulanan)',
        '- /ajk (Struktur Jawatankuasa Mentadbir)',
        '- /ahli (Pendaftaran Ahli Kelab)',
        '- /kewangan (Kewangan)',
        'Contoh Pengguna: "Macam mana nak hantar laporan?"',
        'Contoh Anda: "Boleh, mari saya bawa awak ke Pusat Dokumen. Sila isikan butiran program di sana. \\n\\n[NAVIGATE:/laporan]"',
        '',
        '== FORMAT ==',
        'Jawapan mestilah PENDEK, mesra, dan santai (Bahasa Melayu moden). JANGAN berikan jawapan panjang melainkan jika amat perlu.',
        'Sila gunakan bullet points jika memberikan senarai fakta.',
        'Jika soalan di luar skop JPP POLISAS, tolak dengan sopan.',
      ].filter(Boolean).join('\n');

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

      const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent';
      const response = await fetch(`${endpoint}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemInstruction }] },
          contents,
          generationConfig: { temperature: 0.3, maxOutputTokens: 1500, topP: 0.85 }, // Tingkatkan dari 700 ke 1500 untuk elak jawapan tergantung
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
        toast.error(`Sistem AI Terganggu: ${errorMsg.includes('429') ? 'Had kuota tamat' : 'Sila cuba lagi'}`);
      }
      return null;
    } finally {
      setIsChatLoading(false);
    }
  };

  return { callAi, sendChatMessage, isLoading, isChatLoading, result, setResult };
}
