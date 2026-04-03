import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DriveUploadResponse {
  url: string;
  fileId: string;
  fileName: string;
}

/**
 * Extract folder ID from either a raw ID or a full Google Drive URL.
 * e.g. "https://drive.google.com/drive/u/1/folders/1Vb-xxx" → "1Vb-xxx"
 *      "1Vb-xxx" → "1Vb-xxx"
 */
function extractFolderId(input: string): string {
  if (input.startsWith('http')) {
    const match = input.match(/\/folders\/([^/?]+)/);
    if (match) return match[1];
    const url = new URL(input);
    const segments = url.pathname.split('/').filter(Boolean);
    return segments[segments.length - 1];
  }
  return input.trim();
}

async function getGoogleAccessToken(): Promise<string> {
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
  const refreshToken = Deno.env.get("GOOGLE_REFRESH_TOKEN");

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Missing secrets");
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const data = await response.json();
  if (!response.ok || !data.access_token) {
    throw new Error("Google OAuth error: " + (data.error_description || data.error || "failed"));
  }
  return data.access_token;
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
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const subfolder = (formData.get("subfolder") as string) || "dokumen";
    const customName = formData.get("customName") as string | null;

    if (!file) {
      return new Response(JSON.stringify({ error: "Fail tidak ditemui." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (file.type !== "application/pdf") {
      return new Response(JSON.stringify({ error: "Hanya fail PDF sahaja dibenarkan." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (file.size > 30 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: "Saiz fail melebihi had 30MB." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rawFolderId = Deno.env.get("GOOGLE_DRIVE_FOLDER_ID");
    if (!rawFolderId) throw new Error("GOOGLE_DRIVE_FOLDER_ID tiada.");

    // Extract clean folder ID (handles both raw ID and full URL)
    const parentFolderId = extractFolderId(rawFolderId);
    console.log("[upload-to-drive] Folder ID:", parentFolderId);

    const accessToken = await getGoogleAccessToken();
    const timestamp = Date.now();
    const fileName = customName ? customName + ".pdf" : subfolder + "_" + timestamp + ".pdf";

    const metadata = {
      name: fileName,
      parents: [parentFolderId],
      description: "JPP-POLISAS | " + subfolder + " | " + new Date().toISOString(),
    };

    const boundary = "boundary_jpp_polisas_upload";
    const metadataPart = "--" + boundary + "\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n" + JSON.stringify(metadata) + "\r\n";
    const fileContent = await file.arrayBuffer();

    const body = new Uint8Array([
      ...new TextEncoder().encode(metadataPart),
      ...new TextEncoder().encode("--" + boundary + "\r\nContent-Type: application/pdf\r\n\r\n"),
      ...new Uint8Array(fileContent),
      ...new TextEncoder().encode("\r\n--" + boundary + "--"),
    ]);

    const uploadResponse = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer " + accessToken,
          "Content-Type": "multipart/related; boundary=\"" + boundary + "\"",
        },
        body,
      }
    );

    if (!uploadResponse.ok) {
      const errText = await uploadResponse.text();
      throw new Error("Drive upload failed (" + uploadResponse.status + "): " + errText);
    }

    const uploadedFile = await uploadResponse.json();

    // Set public read permissions
    await fetch(
      "https://www.googleapis.com/drive/v3/files/" + uploadedFile.id + "/permissions",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer " + accessToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role: "reader", type: "anyone" }),
      }
    );

    const viewUrl = uploadedFile.webViewLink || "https://drive.google.com/file/d/" + uploadedFile.id + "/view";

    return new Response(JSON.stringify({
      url: viewUrl,
      fileId: uploadedFile.id,
      fileName: uploadedFile.name,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    const msg = error instanceof Error ? error.message : "Ralat dalaman server.";
    console.error("[upload-to-drive] Error:", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
