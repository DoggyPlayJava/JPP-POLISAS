import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';

export type AiTask = "analyze_performance" | "review_kertas_kerja" | "suggest_program" | "generate_draft" | "summarize_report" | "custom_query" | "semak_tatabahasa_laporan" | "jana_belanjawan_ai" | "pecahkan_tugasan_ai";

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
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) throw new Error("Sila konfigurasikan VITE_GEMINI_API_KEY dalam fail .env anda.");

      let systemInstruction = "Anda adalah pembantu AI yang sedia membantu dalam Bahasa Melayu.";
      let userPrompt = "";
      let outputLimit = 8192; // Default limit

      if (params.task === 'analyze_performance') {
        systemInstruction = "Anda adalah penasihat penganalisis kelab berkaliber untuk Kelab dan Persatuan. Anda berfikir secara kritikal dan logik berdasarkan metrik.";
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
        systemInstruction = "Anda adalah Ketua Semakan Dokumentasi (AI) Majlis Perwakilan Pelajar (JPP POLISAS). Anda profesional, teliti, dan menitikberatkan rasional, perancangan kewangan, serta faedah program teknikal.";
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

      } else if (params.task === 'custom_query') {
        systemInstruction = "Anda adalah AI rasmi platform web JPP POLISAS. Anda HANYA DIBENARKAN untuk menjawab hal-hal berkaitan kelab, persatuan, dokumentasi aktiviti, dan maklumat kampus POLISAS. Jika subjek di luar skop ini, tolak dengan sopan.\n\nARAHAN WAJIB (STRICT): Anda mesti merumuskan jawapan kepada yang SANGAT PENDEK, mesra, dan santai. JANGAN berikan jawapan panjang lebar melainkan jika betul betul mendesak";
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

      const endpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

      const response = await fetch(`${endpoint}?key=${apiKey}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemInstruction }] },
          contents: [{ parts: [{ text: userPrompt }] }],
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

      cacheRef.current[cacheKey] = text; // Simpan ke dalam cache
      setResult(text);
      return text;

    } catch (e: any) {
      console.error("AI Assistant Error:", e);
      const errorMsg = e.message || String(e);

      if (errorMsg.includes('Polisi Keselamatan')) {
        // Ralat disebabkan input pelajar (vulgar/haram)
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
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) throw new Error('Sila konfigurasikan VITE_GEMINI_API_KEY dalam fail .env anda.');

      const systemInstruction = [
        'Anda adalah AI rasmi platform web JPP POLISAS (Jabatan Pelajar Politeknik Sultan Abdul Aziz Shah).',
        'Anda HANYA DIBENARKAN menjawab soalan berkaitan kelab pelajar, persatuan, dokumentasi aktiviti, dan maklumat umum kampus POLISAS.',
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
      return text;

    } catch (e: any) {
      console.error('Chat AI Error:', e);
      const errorMsg = e.message || String(e);
      if (errorMsg.includes('Polisi Keselamatan')) {
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

