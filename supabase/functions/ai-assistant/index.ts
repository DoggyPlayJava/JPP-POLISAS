// ─── Edge Function: ai-assistant ─────────────────────────────────────────────
// JPP-POLISAS: Gemini AI Assistant Foundation
//
// Satu Edge Function untuk SEMUA AI tasks — foundation yang kukuh
// untuk pengembangan AI features pada masa akan datang.
//
// Tasks yang disokong:
//   - summarize_report    : Ringkaskan laporan bulanan kelab
//   - generate_draft      : Jana draft kertas kerja dari template
//   - analyze_performance : Analisis trend merit & prestasi kelab
//   - karnival_faq        : Jawab soalan tentang Hari Karnival
//   - suggest_program     : Cadangkan program berdasarkan histori kelab
//
// Environment Variables:
//   GEMINI_API_KEY — API key dari Google AI Studio (percuma)
// ─────────────────────────────────────────────────────────────────────────────

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

type AiTask =
  | "summarize_report"
  | "generate_draft"
  | "analyze_performance"
  | "karnival_faq"
  | "suggest_program";

interface AiRequest {
  task: AiTask;
  data?: Record<string, any>;
  question?: string;  // untuk karnival_faq
}

// ── System prompts untuk setiap task ──────────────────────────────────────────
function buildPrompt(task: AiTask, data: Record<string, any>, question?: string): string {
  const clubName = data.clubName || "Kelab";
  const lang = "Bahasa Melayu";

  switch (task) {
    case "summarize_report":
      return `Anda adalah pembantu JPP POLISAS. Ringkaskan laporan bulanan kelab berikut dalam ${lang} yang formal dan profesional. Sertakan: (1) Pencapaian utama, (2) Isu yang dihadapi, (3) Cadangan penambahbaikan.

Data laporan:
${JSON.stringify(data.reportData, null, 2)}

Hasilkan ringkasan dalam 3-4 perenggan.`;

    case "generate_draft":
      return `Anda adalah pembantu pentadbiran JPP POLISAS. Jana draft kertas kerja untuk program berikut dalam ${lang} yang formal.

Maklumat program:
- Nama Program: ${data.programName}
- Tarikh: ${data.date}
- Tempat: ${data.venue}
- Anggaran Bajet: RM ${data.budget}
- Kelab: ${clubName}

Sertakan bahagian: Pendahuluan, Objektif, Atur Cara, Bajet, Penutup.`;

    case "analyze_performance":
      return `Anda adalah penganalisis prestasi untuk JPP POLISAS. Berikan analisis prestasi kelab ${clubName} berdasarkan data berikut dalam ${lang}.

Data prestasi:
${JSON.stringify(data, null, 2)}

Berikan: (1) Penilaian keseluruhan, (2) Kekuatan, (3) Bidang yang perlu diperbaiki, (4) Cadangan konkrit.`;

    case "karnival_faq":
      return `Anda adalah pembantu maklumat Hari Karnival JPP POLISAS. Jawab soalan pelajar dalam ${lang} yang mesra dan ringkas.

Maklumat Karnival:
- Penganjur: JPP POLISAS
- Tujuan: Promosi kelab dan persatuan
- Ciri-ciri: Pendaftaran kelab, Pameran, Pengundian

Soalan pelajar: ${question}

Jawab dengan tepat, mesra, dan tidak lebih dari 3 ayat.`;

    case "suggest_program":
      return `Anda adalah perancang program yang berpengalaman untuk persatuan pelajar POLISAS. Berdasarkan histori aktiviti kelab ${clubName}, cadangkan 3 program yang bersesuaian untuk bulan hadapan dalam ${lang}.

Histori aktiviti:
${JSON.stringify(data.history, null, 2)}

Berikan: Nama program, objektif singkat, dan tarikh cadangan untuk setiap program.`;

    default:
      return `Bantu saya dengan pertanyaan ini dalam Bahasa Melayu: ${question || JSON.stringify(data)}`;
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Authorization, Content-Type",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY tidak dikonfigurasi" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const body: AiRequest = await req.json();
    const { task, data = {}, question } = body;

    if (!task) {
      return new Response(
        JSON.stringify({ error: "Parameter 'task' diperlukan" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const prompt = buildPrompt(task, data, question);

    // Hantar ke Gemini API
    const geminiResponse = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
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
      throw new Error("Gemini tidak mengembalikan respons yang sah");
    }

    return new Response(
      JSON.stringify({ result: text, task }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );

  } catch (error: any) {
    console.error("[ai-assistant] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "AI request gagal" }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});
