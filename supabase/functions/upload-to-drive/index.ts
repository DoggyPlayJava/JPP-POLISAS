// ─── Edge Function: upload-to-drive ──────────────────────────────────────────
// JPP-POLISAS: Google Drive File Upload Proxy
//
// Cara kerja:
// 1. Frontend hantar request dengan Bearer token (JWT Supabase)
// 2. Edge Function verify token (Supabase auto-handle via verify_jwt: true)
// 3. Edge Function authenticate ke Google Drive dengan Service Account
// 4. Fail diupload ke folder yang betul dalam Google Drive
// 5. Public sharing URL dikembalikan ke frontend
//
// Environment Variables yang diperlukan (dalam Supabase Dashboard → Secrets):
//   GOOGLE_SERVICE_ACCOUNT_JSON  — JSON key dari Google Cloud Service Account
//   GOOGLE_DRIVE_FOLDER_ID       — ID folder parent dalam Google Drive
// ─────────────────────────────────────────────────────────────────────────────

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

interface DriveUploadResponse {
  url: string;
  fileId: string;
  fileName: string;
}

// Dapatkan Google OAuth2 access token menggunakan Service Account JWT
async function getGoogleAccessToken(serviceAccount: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const expiresIn = 3600; // 1 jam

  const header = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = btoa(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/drive.file",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + expiresIn,
    iat: now,
  }));

  const signingInput = `${header}.${payload}`;

  // Import private key dari PEM
  const pemKey = serviceAccount.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\n/g, "");

  const binaryKey = Uint8Array.from(atob(pemKey), c => c.charCodeAt(0));
  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    privateKey,
    new TextEncoder().encode(signingInput)
  );

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)));
  const jwt = `${signingInput}.${signatureB64}`;

  // Tukar JWT kepada access token
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const tokenData = await tokenResponse.json();
  if (!tokenData.access_token) {
    throw new Error("Gagal mendapatkan Google access token");
  }
  return tokenData.access_token;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
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
    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const subfolder = (formData.get("subfolder") as string) || "lain";
    const customName = formData.get("customName") as string | null;

    if (!file) {
      return new Response(JSON.stringify({ error: "Fail tidak ditemui" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Load credentials dari environment
    const serviceAccountJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
    const parentFolderId = Deno.env.get("GOOGLE_DRIVE_FOLDER_ID");

    if (!serviceAccountJson || !parentFolderId) {
      return new Response(
        JSON.stringify({ error: "Google Drive credentials tidak dikonfigurasi" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const serviceAccount = JSON.parse(serviceAccountJson);
    const accessToken = await getGoogleAccessToken(serviceAccount);

    // Nama fail: guna customName atau generate auto
    const timestamp = Date.now();
    const ext = file.name.split(".").pop() || "bin";
    const fileName = customName
      ? `${customName}.${ext}`
      : `${subfolder}_${timestamp}.${ext}`;

    // Metadata fail Google Drive
    const metadata = {
      name: fileName,
      parents: [parentFolderId],
      description: `JPP-POLISAS | ${subfolder} | Upload: ${new Date().toISOString()}`,
    };

    // Upload ke Google Drive menggunakan multipart
    const boundary = "boundary_jpp_polisas";
    const metadataPart = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`;
    const fileContent = await file.arrayBuffer();

    const body = new Uint8Array([
      ...new TextEncoder().encode(metadataPart),
      ...new TextEncoder().encode(`--${boundary}\r\nContent-Type: ${file.type}\r\n\r\n`),
      ...new Uint8Array(fileContent),
      ...new TextEncoder().encode(`\r\n--${boundary}--`),
    ]);

    const uploadResponse = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": `multipart/related; boundary="${boundary}"`,
        },
        body,
      }
    );

    if (!uploadResponse.ok) {
      const errText = await uploadResponse.text();
      throw new Error(`Google Drive upload gagal: ${errText}`);
    }

    const uploadedFile = await uploadResponse.json();

    // Set permission untuk public read
    await fetch(
      `https://www.googleapis.com/drive/v3/files/${uploadedFile.id}/permissions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role: "reader", type: "anyone" }),
      }
    );

    // Generate URL yang boleh diakses terus (bukan webViewLink)
    const directUrl = `https://drive.google.com/uc?id=${uploadedFile.id}&export=download`;
    const viewUrl = `https://drive.google.com/file/d/${uploadedFile.id}/view`;

    const result: DriveUploadResponse = {
      url: viewUrl,         // URL untuk display/sharing
      fileId: uploadedFile.id,
      fileName: uploadedFile.name,
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });

  } catch (error: any) {
    console.error("[upload-to-drive] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Upload gagal" }),
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
