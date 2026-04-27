import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Guna model GEMINI 2.5 Flash - model terbaru & aktif Google AI yang menyokong kuota Free Tier
const GEMINI_API_URL_PRO = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type AiTask =
  | "analyze_performance"
  | "review_kertas_kerja"
  | "suggest_program"
  | "generate_draft"
  | "summarize_report";

interface AiRequest {
  task: AiTask;
  data?: Record<string, any>;
  clubId?: string;
  programId?: string;
}

interface PromptPayload {
  systemInstruction: string;
  userPrompt: string;
}

async function buildPromptForDB(task: AiTask, reqBody: AiRequest, supabase: any): Promise<PromptPayload> {
  const lang = "Bahasa Melayu";
  let systemInstruction = "Anda adalah pembantu AI yang sedia membantu dalam Bahasa Melayu.";
  let userPrompt = "";

  switch (task) {
    case "analyze_performance": {
      systemInstruction = "Anda adalah penasihat penganalisis kelab berkaliber untuk JPP POLISAS. Anda berfikir secara kritikal dan logik berdasarkan metrik.";
      
      let clubData = reqBody.data;
      if (!clubData && reqBody.clubId) {
        // Fetch raw data if frontend didn't supply it
        const [ { data: club }, { count: members }, { data: activities }, { count: tasks } ] = await Promise.all([
          supabase.from("clubs").select("name").eq("id", reqBody.clubId).single(),
          supabase.from("student_club_memberships").select("user_id", { count: "exact", head: true }).eq("club_id", reqBody.clubId),
          supabase.from("club_activities").select("status, budget").eq("club_id", reqBody.clubId),
          supabase.from("club_tasks").select("id", { count: "exact", head: true }).eq("club_id", reqBody.clubId)
        ]);
        
        clubData = {
          clubName: club?.name || "Kelab POLISAS",
          totalMembers: members || 0,
          totalActivities: activities?.length || 0,
          completedActivities: activities?.filter((a: any) => a.status === 'selesai').length || 0,
          usedBudget: activities?.reduce((sum: number, a: any) => sum + (a.budget || 0), 0) || 0,
          totalTasksIssued: tasks || 0
        };
      }

      userPrompt = `Buat analisis prestasi kelab berdasarkan data objektif ini dalam ${lang}.

Data Kelab:
${JSON.stringify(clubData, null, 2)}

Hasilkan laporan yang mengandungi: (1) Penilaian Keseluruhan (Pendek), (2) Isu Berpotensi (jika aktiviti rendah/banyak budget), (3) 2 Cadangan Konkrit untuk Exco Kelab. Gunakan format Markdown yang menarik dan ringkas.`;
      break;
    }

    case "review_kertas_kerja": {
      systemInstruction = "Anda adalah Ketua Semakan Dokumentasi (AI) Majlis Perwakilan Pelajar (JPP POLISAS). Anda profesional, teliti, dan menitikberatkan rasional, perancangan kewangan, serta faedah program teknikal.";
      if (!reqBody.programId) {
        throw new Error("programId diperlukan untuk semakan kertas kerja.");
      }

      const { data: program, error } = await supabase
        .from('programs')
        .select('nama_program, deskripsi, tarikh_mula, tarikh_tamat, location, budget, status, club_id')
        .eq('id', reqBody.programId)
        .single();

      if (error || !program) {
        throw new Error(`Data program ID ${reqBody.programId} tidak dijumpai.`);
      }

      const { data: club } = await supabase.from('clubs').select('name').eq('id', program.club_id).single();

      userPrompt = `Buat semakan draf Kertas Kerja Program ini sebelum diluluskan oleh Admin JPP.

[ BUTIRAN KERTAS KERJA ]
- Kelab: ${club?.name || 'Tidak Dinyatakan'}
- Nama Program: ${program.nama_program}
- Tarikh: ${program.tarikh_mula} hingga ${program.tarikh_tamat}
- Lokasi: ${program.location || 'Tidak Dinyatakan'}
- Anggaran Bajet: RM ${program.budget || '0'}
- Objektif & Aktiviti (Deskripsi): ${program.deskripsi || 'Tiada deskripsi.'}

[ ARAHAN PENILAIAN ]
Tulis satu laporan semakan (AI Review) dalam 3 bahagian teras:
1. Kekuatan Perancangan (Komen positif ringkas).
2. Potensi Risiko & Kekurangan (Cth: bajet tak padan dengan aktiviti, atau deskripsi terlalu kabur).
3. Rating Kelulusan JPP (Adakah Sangat Disyorkan, Kurang Disyorkan, atau Perlu Pindaan Besar? Berikan % Skor kualiti).`;
      break;
    }

    default:
      // Fallback for purely data driven (suggest_program, summarize_report, generate_draft)
      systemInstruction = "Anda adalah pembantu AI integrasi JPP POLISAS.";
      userPrompt = `Selesaikan tugas: ${task} berasaskan data berikut: ${JSON.stringify(reqBody.data || {})}`;
      break;
  }

  return { systemInstruction, userPrompt };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Akses ditolak: Tiada Authorization." }), { status: 401, headers: corsHeaders });
    }

    // Initialize Supabase Client context
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY tidak dikonfigurasi.");
    }

    // Initialize Admin Client for internal operations
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // RATE LIMIT CHECK
    const { data: settingsSettings } = await supabaseAdmin.from('system_settings').select('*').in('key', ['ai_total_tokens', 'ai_token_limit']);
    let totalTokens = 0;
    let tokenLimit = 1000000;
    
    settingsSettings?.forEach((setting: any) => {
        if (setting.key === 'ai_total_tokens') totalTokens = parseInt(setting.value) || 0;
        if (setting.key === 'ai_token_limit') tokenLimit = parseInt(setting.value) || 1000000;
    });

    if (totalTokens >= tokenLimit) {
        return new Response(JSON.stringify({ error: "Kuota token AI untuk bulan ini telah didakwa maksimum oleh Pusat Kawalan JPP. Sila hubungi Administrator." }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }

    const body: any = await req.json();
    
    // --- MOD PROXY KESELAMATAN (DARI USEAIASSISTANT) ---
    if (body.action === 'proxy') {
        const { endpoint, payload } = body;
        
        if (!endpoint || !endpoint.startsWith('https://generativelanguage.googleapis.com/')) {
            throw new Error("Endpoint API tidak dibenarkan. Keselamatan diceroboh.");
        }
        
        const geminiResponse = await fetch(`${endpoint}?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        
        const geminiData = await geminiResponse.json();
        
        // Rekod penggunaan Token ke dalam pangkalan data
        const usedTokens = geminiData?.usageMetadata?.totalTokenCount || 0;
        if (usedTokens > 0) {
            const newTotal = totalTokens + usedTokens;
            const { data: existingTokenRow } = await supabaseAdmin.from('system_settings').select('id').eq('key', 'ai_total_tokens');
            if (existingTokenRow && existingTokenRow.length > 0) {
                 await supabaseAdmin.from('system_settings').update({ value: newTotal }).eq('key', 'ai_total_tokens');
            } else {
                 await supabaseAdmin.from('system_settings').insert({ key: 'ai_total_tokens', value: newTotal });
            }
        }
        
        // Memulangkan status HTTP asal Google API dan datanya
        return new Response(JSON.stringify({
             status: geminiResponse.status,
             ...geminiData
        }), {
             status: 200, // Supabase client expect 200, ralat API akan dikendalikan di frontend
             headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }
    // --- TAMAT MOD PROXY ---

    if (!body.task) {
      throw new Error("Parameter 'task' diperlukan.");
    }

    // 1. Bina Prompt dan Fetch Data DB Securely
    const { systemInstruction, userPrompt } = await buildPromptForDB(body.task, body, supabaseClient);

    // 2. Call Gemini API - gemini-2.5-flash adalah model aktif terkini untuk free tier
    const endpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

    const geminiResponse = await fetch(`${endpoint}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemInstruction }] },
        contents: [{ parts: [{ text: userPrompt }] }],
        generationConfig: {
          temperature: 0.5,
          maxOutputTokens: 8192, // Sesuai untuk perancangan dan laporan panjang
          topP: 0.9,
        },
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        ],
      }),
    });

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text();
      throw new Error(`Gemini API error: ${errText}`);
    }

    const geminiData = await geminiResponse.json();
    const text = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error("Gemini API tidak mengembalikan text yang sah.");
    }

    // RECORD TOKEN USAGE
    const usedTokens = geminiData?.usageMetadata?.totalTokenCount || 0;
    if (usedTokens > 0) {
        const newTotal = totalTokens + usedTokens;
        
        // Cek format (if value exists/is missing in DB)
        const { data: existingTokenRow } = await supabaseAdmin.from('system_settings').select('id').eq('key', 'ai_total_tokens');
        if (existingTokenRow && existingTokenRow.length > 0) {
             await supabaseAdmin.from('system_settings').update({ value: newTotal }).eq('key', 'ai_total_tokens');
        } else {
             await supabaseAdmin.from('system_settings').insert({ key: 'ai_total_tokens', value: newTotal });
        }
    }

    return new Response(JSON.stringify({ result: text, task: body.task }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("[ai-assistant] Error:", error.message);
    return new Response(JSON.stringify({ error: error.message || "Ralat Pelayan Dalaman" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
