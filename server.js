import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';
import rateLimit from 'express-rate-limit';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 8000;

// Enable CORS
app.use(cors());

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure multer for file uploads in memory
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 30 * 1024 * 1024 } // 30MB limit
});

// Initialize Supabase Admin Client
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.warn("WARNING: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set. Some backend API functions will fail.");
}

const supabaseAdmin = supabaseUrl && supabaseServiceKey 
    ? createClient(supabaseUrl, supabaseServiceKey) 
    : null;

// ==========================================
// Middleware: Verify Supabase JWT
// ==========================================
const requireAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: "Unauthorized: Missing or invalid Authorization header." });
        }
        const token = authHeader.split(' ')[1];
        if (!supabaseAdmin) throw new Error("Supabase Admin Client not initialized.");
        
        const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
        if (error || !user) {
            return res.status(401).json({ error: "Unauthorized: Invalid token." });
        }
        req.user = user;
        next();
    } catch (err) {
        console.error("[Auth Middleware] Error:", err.message);
        return res.status(500).json({ error: "Internal Server Error during authentication." });
    }
};

// ==========================================
// Middleware: Verify Webhook Secret
// ==========================================
const requireWebhookSecret = (req, res, next) => {
    const secret = req.headers['x-webhook-secret'] || req.query.secret;
    const expectedSecret = process.env.WEBHOOK_SECRET;
    
    if (!expectedSecret) {
        console.warn("WARNING: WEBHOOK_SECRET is not set in environment variables. Webhook endpoints are open.");
        return next();
    }
    
    if (secret !== expectedSecret) {
        return res.status(401).json({ error: "Unauthorized: Invalid webhook secret." });
    }
    next();
};

// ==========================================
// Middleware: AI Rate Limiter (IP Based)
// ==========================================
const aiRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // Limit each IP to 50 requests per window
    message: { error: "Terlalu banyak permintaan AI daripada IP ini. Sila cuba lagi selepas 15 minit." },
    standardHeaders: true,
    legacyHeaders: false,
});

// ==========================================
// 1. AI Assistant Endpoint
// ==========================================
app.post('/api/ai-assistant', requireAuth, aiRateLimiter, async (req, res) => {
    try {
        // Header and token check are now handled by requireAuth middleware

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error("GEMINI_API_KEY tidak dikonfigurasi.");
        }

        // Initialize Supabase Client context with the validated header
        const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
        const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: req.headers.authorization } },
        });

        // RATE LIMIT CHECK
        if (!supabaseAdmin) throw new Error("Supabase Admin Client not initialized.");
        const { data: settingsSettings } = await supabaseAdmin.from('system_settings').select('*').in('key', ['ai_total_tokens', 'ai_token_limit']);
        let totalTokens = 0;
        let tokenLimit = 1000000;
        
        settingsSettings?.forEach((setting) => {
            if (setting.key === 'ai_total_tokens') totalTokens = parseInt(setting.value) || 0;
            if (setting.key === 'ai_token_limit') tokenLimit = parseInt(setting.value) || 1000000;
        });

        if (totalTokens >= tokenLimit) {
            return res.status(403).json({ error: "Kuota token AI untuk bulan ini telah didakwa maksimum oleh Pusat Kawalan JPP. Sila hubungi Administrator." });
        }

        const body = req.body;
        
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
            
            return res.status(200).json({ status: geminiResponse.status, ...geminiData });
        }

        return res.status(400).json({ error: "Laluan (route) yang dipanggil bukan proksi. Gunakan modul Edge Functions jika perlukan sokongan kompleks."});

    } catch (error) {
        console.error("[ai-assistant] Error:", error.message);
        return res.status(500).json({ error: error.message || "Ralat Pelayan Dalaman" });
    }
});

// ==========================================
// Reusable Email Function
// ==========================================
async function sendEmailInternal(to, subject, html) {
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) {
        throw new Error("Missing RESEND_API_KEY secret.");
    }

    const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
            from: "JPP Polisas <jpp@cipher-node.org>",
            to,
            subject,
            html,
        }),
    });

    const data = await response.json();
    if (!response.ok) {
        console.error("[sendEmailInternal] Resend API error:", data);
        throw new Error(data.message || "Ralat Resend API");
    }
    return data;
}

// ==========================================
// 2. Send Email Endpoint
// ==========================================
app.post('/api/send-email', requireAuth, async (req, res) => {
    try {
        const { to, subject, html } = req.body;

        if (!to || !subject || !html) {
            return res.status(400).json({ error: "Missing required parameters: to, subject, html" });
        }

        const data = await sendEmailInternal(to, subject, html);
        return res.status(200).json(data);
    } catch (error) {
        const msg = error instanceof Error ? error.message : "Ralat dalam penghantaran emel.";
        console.error("[send-email] Error:", msg);
        return res.status(500).json({ error: msg });
    }
});

// ==========================================
// 3. Kebajikan SLA Check Endpoint
// ==========================================
app.post('/api/check-kebajikan-sla', requireWebhookSecret, async (req, res) => {
    try {
        if (!supabaseAdmin) throw new Error("Supabase Admin Client not initialized.");
        
        const DEFAULT_WARNING_HOURS = 48;
        const DEFAULT_ESCALATE_HOURS = 72;

        const { data: settingsRow } = await supabaseAdmin
            .from("kebajikan_settings")
            .select("*")
            .limit(1)
            .single();

        const warningHours = Number(settingsRow?.sla_warning_hours ?? DEFAULT_WARNING_HOURS);
        const escalateHours = Number(settingsRow?.sla_escalate_hours ?? DEFAULT_ESCALATE_HOURS);
        const emailWarning = settingsRow?.email_warning ?? false;
        const emailEscalation = settingsRow?.email_escalation ?? false;

        let excosEmails = [];
        if (emailWarning || emailEscalation) {
            const { data: excos } = await supabaseAdmin
                .from("profiles")
                .select("email")
                .eq("role", "JPP")
                .eq("jpp_unit", "KEBAJIKAN");
            excosEmails = excos?.map((e) => e.email).filter(Boolean) || [];
        }

        const now = new Date();
        const warningCutoff = new Date(now.getTime() - warningHours * 3600000).toISOString();
        const escalateCutoff = new Date(now.getTime() - escalateHours * 3600000).toISOString();

        const { data: tickets, error: ticketErr } = await supabaseAdmin
            .from("kebajikan_tickets")
            .select("id, ticket_no, title, status, updated_at, warning_sent_at, escalated_at, assigned_to, category")
            .not("status", "in", "(RESOLVED,CLOSED,CANCELLED)");

        if (ticketErr) throw ticketErr;
        if (!tickets || tickets.length === 0) {
            return res.status(200).json({ message: "No active tickets." });
        }

        const results = { warned: 0, escalated: 0, skipped: 0 };

        for (const ticket of tickets) {
            const lastUpdateAt = ticket.updated_at;

            if (ticket.status !== "ESCALATED" && !ticket.escalated_at && lastUpdateAt < escalateCutoff) {
                await supabaseAdmin
                    .from("kebajikan_tickets")
                    .update({ status: "ESCALATED", escalated_at: now.toISOString() })
                    .eq("id", ticket.id);

                await supabaseAdmin.from("kebajikan_ticket_status_log").insert({
                    ticket_id: ticket.id,
                    actor_role: "SISTEM",
                    actor_name: "Sistem Auto-Escalation",
                    old_status: ticket.status,
                    new_status: "ESCALATED",
                    note: `Auto-escalated selepas ${escalateHours} jam tanpa kemaskini.`,
                });

                await supabaseAdmin.from("kebajikan_notifications").insert({
                    ticket_id: ticket.id,
                    target_role: "EXCO_KEBAJIKAN",
                    title: `🚨 Auto-Escalation: ${ticket.ticket_no}`,
                    body: `Tiket "${ticket.title}" telah diescalate secara automatik selepas ${escalateHours} jam tanpa tindakan.`,
                    type: "ESCALATION",
                });

                if (emailEscalation && excosEmails.length > 0) {
                    const html = `<div style="font-family: sans-serif; padding: 20px;">
                        <h2>🚨 Auto-Escalation (${escalateHours} Jam)</h2>
                        <p>Sistem telah auto-escalate tiket ini kerana tiada tindakan selama lebih ${escalateHours} jam.</p>
                        <p><strong>No. Tiket:</strong> ${ticket.ticket_no}</p>
                        <p><strong>Tajuk:</strong> ${ticket.title}</p>
                    </div>`;
                    
                    sendEmailInternal(
                        excosEmails,
                        `🚨 Auto-Escalation: ${ticket.ticket_no}`,
                        html
                    ).catch(err => console.error("Gagal hantar emel escalation:", err));
                }
                results.escalated++;
                continue;
            }

            if (!ticket.warning_sent_at && lastUpdateAt < warningCutoff && lastUpdateAt >= escalateCutoff) {
                await supabaseAdmin
                    .from("kebajikan_tickets")
                    .update({ warning_sent_at: now.toISOString() })
                    .eq("id", ticket.id);

                await supabaseAdmin.from("kebajikan_notifications").insert({
                    ticket_id: ticket.id,
                    target_role: "EXCO_KEBAJIKAN",
                    title: `⚠️ SLA Warning: ${ticket.ticket_no}`,
                    body: `Tiket "${ticket.title}" belum diproses lebih dari ${warningHours} jam. Sila ambil tindakan segera.`,
                    type: "WARNING",
                });

                if (emailWarning && excosEmails.length > 0) {
                    const html = `<div style="font-family: sans-serif; padding: 20px;">
                        <h2>⚠️ Amaran SLA (${warningHours} Jam)</h2>
                        <p>Tiket ini belum menerima sebarang kemaskini melebihi ${warningHours} jam. Sila ambil tindakan segera.</p>
                        <p><strong>No. Tiket:</strong> ${ticket.ticket_no}</p>
                        <p><strong>Tajuk:</strong> ${ticket.title}</p>
                    </div>`;
                    
                    sendEmailInternal(
                        excosEmails,
                        `⚠️ Amaran SLA: ${ticket.ticket_no}`,
                        html
                    ).catch(err => console.error("Gagal hantar emel warning:", err));
                }
                results.warned++;
                continue;
            }
            results.skipped++;
        }

        return res.status(200).json({ success: true, processed: tickets.length, ...results, sla: { warningHours, escalateHours } });
    } catch (err) {
        console.error("[check-kebajikan-sla] Error:", err.message);
        return res.status(500).json({ error: err.message });
    }
});

// ==========================================
// 4. Kebajikan New Ticket Webhook Endpoint
// ==========================================
app.post('/api/kebajikan-new-ticket-notify', requireWebhookSecret, async (req, res) => {
    try {
        if (!supabaseAdmin) throw new Error("Supabase Admin Client not initialized.");
        
        const payload = req.body;

        if (payload.type !== "INSERT") {
            return res.status(200).send("Not an INSERT event.");
        }

        const { id, ticket_no, title, category, full_name } = payload.record;

        if (!id || !ticket_no) {
            return res.status(400).send("Missing ticket data.");
        }

        const { error: notifErr } = await supabaseAdmin.from("kebajikan_notifications").insert({
            ticket_id: id,
            target_user_id: null,         
            target_role: "EXCO_KEBAJIKAN",
            title: `📣 Aduan Baru: ${ticket_no}`,
            body: `"${title}" dikemukakan oleh ${full_name}. Kategori: ${category}. Sila semak dan ambil tindakan.`,
            type: "NEW_TICKET",
        });

        if (notifErr) {
            console.error("[kebajikan-new-ticket-notify] Notification insert error:", notifErr.message);
        }

        const RESEND_API_KEY = process.env.RESEND_API_KEY;
        if (RESEND_API_KEY) {
            const { data: excoUsers } = await supabaseAdmin
                .from("profiles")
                .select("email, full_name")
                .eq("role", "JPP")
                .eq("jpp_unit", "KEBAJIKAN");
        
            for (const exco of excoUsers ?? []) {
                fetch("https://api.resend.com/emails", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${RESEND_API_KEY}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        from: "E-Kebajikan <kebajikan@polisas.edu.my>",
                        to: exco.email,
                        subject: `[E-Kebajikan] Aduan Baru: ${ticket_no}`,
                        html: `<p>Salam, ${exco.full_name}.<br/>Aduan baru <strong>${ticket_no}</strong> telah diterima.<br/><strong>${title}</strong><br/>Sila log masuk ke sistem untuk mengambil tindakan.</p>`,
                    }),
                });
            }
        }

        return res.status(200).json({ success: true, ticket_no, notif_created: !notifErr });
    } catch (err) {
        console.error("[kebajikan-new-ticket-notify] Error:", err.message);
        return res.status(500).json({ error: err.message });
    }
});

// ==========================================
// 5. Upload to Google Drive Endpoint
// ==========================================
function extractFolderId(input) {
    if (input.startsWith('http')) {
        const match = input.match(/\/folders\/([^/?]+)/);
        if (match) return match[1];
        const url = new URL(input);
        const segments = url.pathname.split('/').filter(Boolean);
        return segments[segments.length - 1];
    }
    return input.trim();
}

async function getGoogleAccessToken() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

    if (!clientId || !clientSecret || !refreshToken) {
        throw new Error("Missing Google Drive secrets");
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

app.post('/api/upload-to-drive', requireAuth, upload.single('file'), async (req, res) => {
    try {
        const file = req.file;
        const subfolder = req.body.subfolder || "dokumen";
        const customName = req.body.customName || null;

        if (!file) {
            return res.status(400).json({ error: "Fail tidak ditemui." });
        }

        if (file.mimetype !== "application/pdf") {
            return res.status(400).json({ error: "Hanya fail PDF sahaja dibenarkan." });
        }

        const rawFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
        if (!rawFolderId) throw new Error("GOOGLE_DRIVE_FOLDER_ID tiada.");

        const parentFolderId = extractFolderId(rawFolderId);
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
        
        const bodyBuffer = Buffer.concat([
            Buffer.from(metadataPart),
            Buffer.from("--" + boundary + "\r\nContent-Type: application/pdf\r\n\r\n"),
            file.buffer,
            Buffer.from("\r\n--" + boundary + "--")
        ]);

        const uploadResponse = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink", {
            method: "POST",
            headers: {
                Authorization: "Bearer " + accessToken,
                "Content-Type": "multipart/related; boundary=\"" + boundary + "\"",
            },
            body: bodyBuffer,
        });

        if (!uploadResponse.ok) {
            const errText = await uploadResponse.text();
            throw new Error("Drive upload failed (" + uploadResponse.status + "): " + errText);
        }

        const uploadedFile = await uploadResponse.json();

        // Set public read permissions
        await fetch("https://www.googleapis.com/drive/v3/files/" + uploadedFile.id + "/permissions", {
            method: "POST",
            headers: {
                Authorization: "Bearer " + accessToken,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ role: "reader", type: "anyone" }),
        });

        const viewUrl = uploadedFile.webViewLink || "https://drive.google.com/file/d/" + uploadedFile.id + "/view";

        return res.status(200).json({
            url: viewUrl,
            fileId: uploadedFile.id,
            fileName: uploadedFile.name,
        });

    } catch (error) {
        console.error("[upload-to-drive] Error:", error.message);
        return res.status(500).json({ error: error.message });
    }
});

// ==========================================
// 6. Web Push Notification Endpoint
// ==========================================
app.post('/api/send-push-notification', requireAuth, async (req, res) => {
    try {
        const { subscription, title, body, data } = req.body;

        const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:jpp@cipher-node.org';
        const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
        const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

        if (!vapidPublicKey || !vapidPrivateKey) {
            throw new Error("VAPID keys belum dikonfigurasi di dalam Environment Variables.");
        }

        webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

        const payload = JSON.stringify({
            title: title,
            body: body,
            data: data,
            icon: '/icon-192-maskable.png',
            badge: '/icon-192-maskable.png'
        });

        const result = await webpush.sendNotification(subscription, payload);

        return res.status(200).json({ success: true, result });
    } catch (error) {
        console.error("[send-push-notification] Error:", error.message);
        return res.status(500).json({ error: error.message });
    }
});

// ==========================================
// 7. Notify Anomaly Endpoint
// ==========================================
app.post('/api/notify-anomaly', requireAuth, async (req, res) => {
    try {
        const { alerts, sentAt } = req.body;
        
        if (!alerts || alerts.length === 0) {
            return res.status(400).json({ error: 'Tiada anomali disediakan' });
        }

        const html = `
            <div style="font-family: sans-serif; padding: 20px;">
                <h2 style="color: #e11d48;">🚨 Amaran Anomali Sistem Dikesan</h2>
                <p>Sistem Audit JPP-POLISAS telah mengesan aktiviti mencurigakan pada <strong>${new Date(sentAt).toLocaleString('ms-MY')}</strong>.</p>
                <br/>
                <table border="1" cellpadding="8" style="border-collapse: collapse; width: 100%;">
                    <tr style="background: #f87171; color: white;">
                        <th>Pengguna</th>
                        <th>Sebab Dikesan</th>
                    </tr>
                    ${alerts.map(a => `
                    <tr>
                        <td>${a.user}</td>
                        <td>${a.reason}</td>
                    </tr>
                    `).join('')}
                </table>
                <p style="margin-top: 20px;">Sila log masuk ke portal untuk tindakan lanjut.</p>
            </div>
        `;

        // Hantar emel menggunakan Resend (menggunakan logik sedia ada dalam send-email)
        const RESEND_API_KEY = process.env.RESEND_API_KEY;
        const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'jpp@cipher-node.org';

        if (!RESEND_API_KEY) {
            throw new Error("RESEND_API_KEY belum dikonfigurasi.");
        }

        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: 'Audit JPP-POLISAS <noreply@jpp-polisas.com>',
                to: ADMIN_EMAIL,
                subject: `🚨 [AMARAN] ${alerts.length} Anomali Sistem Dikesan`,
                html: html
            })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Gagal menghantar amaran anomali');

        return res.status(200).json({ success: true, data });
    } catch (error) {
        console.error("[notify-anomaly] Error:", error.message);
        return res.status(500).json({ error: error.message });
    }
});

// ==========================================
// 8. Reset Password via Resend HTTP API
//    (Bypass SMTP sepenuhnya — port tak perlu)
// ==========================================
app.post('/api/reset-password', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email || typeof email !== 'string' || !email.includes('@')) {
            return res.status(400).json({ error: 'Alamat emel tidak sah.' });
        }

        if (!supabaseAdmin) {
            throw new Error('Supabase Admin Client tidak diinisialisasi.');
        }

        const RESEND_API_KEY = process.env.RESEND_API_KEY;
        if (!RESEND_API_KEY) {
            throw new Error('RESEND_API_KEY tidak dikonfigurasi.');
        }

        // Langkah 1: Jana pautan reset menggunakan Supabase Admin API
        // (Ini tidak menggunakan SMTP langsung — ia hanya menjana token selamat)
        const redirectTo = process.env.GOTRUE_SITE_URL
            ? `${process.env.GOTRUE_SITE_URL.replace(/\/$/, '')}/reset-password`
            : 'https://jpp.cipher-node.org/reset-password';

        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
            type: 'recovery',
            email: email.trim().toLowerCase(),
            options: { redirectTo },
        });

        if (linkError) {
            console.error('[reset-password] generateLink error:', linkError.message);
            // Balas "berjaya" walaupun emel tiada — elak pendedahan maklumat pengguna
            return res.status(200).json({ success: true, message: 'Jika emel ini berdaftar, pautan reset akan dihantar.' });
        }

        const resetLink = linkData?.properties?.action_link;
        if (!resetLink) {
            console.error('[reset-password] Tiada action_link dijana');
            return res.status(200).json({ success: true, message: 'Jika emel ini berdaftar, pautan reset akan dihantar.' });
        }

        // Langkah 2: Hantar emel cantik menggunakan Resend HTTP API
        const emailHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tetapkan Semula Kata Laluan | JPP POLISAS</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background-color:#f4f4f5;">
    <div style="background-color:#f4f4f5;padding:40px 20px;text-align:center;">
        <table align="center" style="max-width:550px;margin:0 auto;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 25px -5px rgba(0,0,0,0.05);width:100%;border-collapse:collapse;" cellpadding="0" cellspacing="0">
            <tr>
                <td style="padding:40px 30px;text-align:center;border-bottom:1px solid #f1f5f9;background-color:#ffffff;">
                    <h1 style="color:#881B1B;font-size:26px;font-weight:900;margin:0;letter-spacing:-0.5px;">JPP POLISAS</h1>
                    <p style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:3px;margin-top:6px;font-weight:800;margin-bottom:0;">Digital Portal</p>
                </td>
            </tr>
            <tr>
                <td style="padding:40px 30px;text-align:center;background-color:#ffffff;">
                    <div style="width:64px;height:64px;background-color:#fef2f2;border-radius:16px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:24px;">
                        <span style="font-size:32px;">🔐</span>
                    </div>
                    <h2 style="color:#0f172a;font-size:22px;font-weight:800;margin:0 0 16px 0;">Tetapkan Semula Kata Laluan</h2>
                    <p style="color:#475569;font-size:15px;line-height:1.7;margin:0 0 12px 0;text-align:left;">
                        Kami menerima permintaan untuk menetapkan semula kata laluan akaun JPP POLISAS yang dikaitkan dengan emel ini.
                    </p>
                    <p style="color:#475569;font-size:15px;line-height:1.7;margin:0 0 32px 0;text-align:left;">
                        Klik butang di bawah untuk menetapkan kata laluan baharu anda. Pautan ini hanya sah selama <strong>1 jam</strong>.
                    </p>
                    <div style="margin:32px 0;">
                        <a href="${resetLink}" style="display:inline-block;background-color:#881B1B;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:16px 40px;border-radius:12px;text-transform:uppercase;letter-spacing:1.5px;box-shadow:0 4px 14px 0 rgba(136,27,27,0.35);">
                            Tetapkan Semula Kata Laluan
                        </a>
                    </div>
                    <p style="color:#94a3b8;font-size:13px;line-height:1.6;margin:0;text-align:left;">
                        Jika anda tidak membuat permintaan ini, sila abaikan emel ini. Akaun anda kekal selamat.
                    </p>
                    <div style="margin-top:24px;padding:16px;background-color:#f8fafc;border-radius:10px;text-align:left;border:1px solid #e2e8f0;">
                        <p style="color:#64748b;font-size:12px;margin:0;word-break:break-all;">
                            Atau salin pautan ini ke pelayar anda:<br/>
                            <span style="color:#881B1B;font-size:11px;">${resetLink}</span>
                        </p>
                    </div>
                </td>
            </tr>
            <tr>
                <td style="padding:24px 30px;background-color:#f8fafc;text-align:center;border-top:1px solid #f1f5f9;">
                    <p style="color:#94a3b8;font-size:12px;margin:0;font-weight:500;">&copy; ${new Date().getFullYear()} Jawatankuasa Perwakilan Pelajar POLISAS.<br/>Hak cipta terpelihara.</p>
                </td>
            </tr>
        </table>
    </div>
</body>
</html>`;

        const resendResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: 'Sistem JPP POLISAS <jpp@cipher-node.org>',
                to: email.trim().toLowerCase(),
                subject: '🔐 Tetapkan Semula Kata Laluan Anda — JPP POLISAS',
                html: emailHtml,
            }),
        });

        const resendData = await resendResponse.json();

        if (!resendResponse.ok) {
            console.error('[reset-password] Resend API error:', resendData);
            throw new Error(resendData.message || 'Gagal menghantar emel melalui Resend.');
        }

        console.log(`[reset-password] Emel reset berjaya dihantar ke: ${email}`);
        return res.status(200).json({ success: true, message: 'Pautan tetapan semula telah dihantar ke emel anda.' });

    } catch (error) {
        console.error('[reset-password] Error:', error.message);
        return res.status(500).json({ error: error.message || 'Ralat pelayan dalaman.' });
    }
});

// ==========================================
// 9. Send Signup Verification Email via Resend
//    (Bypass GoTrue SMTP — self-hosted SMTP blocked)
// ==========================================
app.post('/api/send-signup-verification', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email || typeof email !== 'string' || !email.includes('@')) {
            return res.status(400).json({ error: 'Alamat emel tidak sah.' });
        }

        if (!supabaseAdmin) {
            throw new Error('Supabase Admin Client tidak diinisialisasi.');
        }

        const RESEND_API_KEY = process.env.RESEND_API_KEY;
        if (!RESEND_API_KEY) {
            throw new Error('RESEND_API_KEY tidak dikonfigurasi.');
        }

        // Jana pautan pengesahan emel menggunakan Supabase Admin API
        const redirectTo = process.env.GOTRUE_SITE_URL
            ? `${process.env.GOTRUE_SITE_URL.replace(/\/$/, '')}/login`
            : 'https://jpp.cipher-node.org/login';

        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
            type: 'signup',
            email: email.trim().toLowerCase(),
            options: { redirectTo },
        });

        if (linkError) {
            console.error('[send-signup-verification] generateLink error:', linkError.message);
            // Still return 200 to avoid email enumeration
            return res.status(200).json({ success: true, message: 'Emel pengesahan akan dihantar jika akaun ditemui.' });
        }

        const verifyLink = linkData?.properties?.action_link;
        if (!verifyLink) {
            console.error('[send-signup-verification] Tiada action_link dijana');
            return res.status(200).json({ success: true, message: 'Emel pengesahan akan dihantar jika akaun ditemui.' });
        }

        const emailHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pengesahan Emel | JPP POLISAS</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background-color:#f4f4f5;">
    <div style="background-color:#f4f4f5;padding:40px 20px;text-align:center;">
        <table align="center" style="max-width:550px;margin:0 auto;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 25px -5px rgba(0,0,0,0.05);width:100%;border-collapse:collapse;" cellpadding="0" cellspacing="0">
            <tr>
                <td style="padding:40px 30px;text-align:center;border-bottom:1px solid #f1f5f9;background-color:#ffffff;">
                    <h1 style="color:#881B1B;font-size:26px;font-weight:900;margin:0;letter-spacing:-0.5px;">JPP POLISAS</h1>
                    <p style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:3px;margin-top:6px;font-weight:800;margin-bottom:0;">Digital Portal</p>
                </td>
            </tr>
            <tr>
                <td style="padding:40px 30px;text-align:center;background-color:#ffffff;">
                    <div style="width:64px;height:64px;background-color:#ecfdf5;border-radius:16px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:24px;">
                        <span style="font-size:32px;">✅</span>
                    </div>
                    <h2 style="color:#0f172a;font-size:22px;font-weight:800;margin:0 0 16px 0;">Sahkan Akaun Anda</h2>
                    <p style="color:#475569;font-size:15px;line-height:1.7;margin:0 0 12px 0;text-align:left;">
                        Terima kasih kerana mendaftar di Portal JPP POLISAS! Sila sahkan alamat emel anda untuk mengaktifkan akaun.
                    </p>
                    <p style="color:#475569;font-size:15px;line-height:1.7;margin:0 0 32px 0;text-align:left;">
                        Klik butang di bawah untuk mengesahkan emel anda. Pautan ini hanya sah selama <strong>24 jam</strong>.
                    </p>
                    <div style="margin:32px 0;">
                        <a href="${verifyLink}" style="display:inline-block;background-color:#16a34a;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:16px 40px;border-radius:12px;text-transform:uppercase;letter-spacing:1.5px;box-shadow:0 4px 14px 0 rgba(22,163,74,0.35);">
                            Sahkan Emel Saya
                        </a>
                    </div>
                    <p style="color:#94a3b8;font-size:13px;line-height:1.6;margin:0;text-align:left;">
                        Jika anda tidak mendaftar akaun ini, sila abaikan emel ini.
                    </p>
                    <div style="margin-top:24px;padding:16px;background-color:#f8fafc;border-radius:10px;text-align:left;border:1px solid #e2e8f0;">
                        <p style="color:#64748b;font-size:12px;margin:0;word-break:break-all;">
                            Atau salin pautan ini ke pelayar anda:<br/>
                            <span style="color:#16a34a;font-size:11px;">${verifyLink}</span>
                        </p>
                    </div>
                </td>
            </tr>
            <tr>
                <td style="padding:24px 30px;background-color:#f8fafc;text-align:center;border-top:1px solid #f1f5f9;">
                    <p style="color:#94a3b8;font-size:12px;margin:0;font-weight:500;">&copy; ${new Date().getFullYear()} Jawatankuasa Perwakilan Pelajar POLISAS.<br/>Hak cipta terpelihara.</p>
                </td>
            </tr>
        </table>
    </div>
</body>
</html>`;

        const resendResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: 'Sistem JPP POLISAS <jpp@cipher-node.org>',
                to: email.trim().toLowerCase(),
                subject: '✅ Sahkan Akaun Anda — JPP POLISAS',
                html: emailHtml,
            }),
        });

        const resendData = await resendResponse.json();

        if (!resendResponse.ok) {
            console.error('[send-signup-verification] Resend API error:', resendData);
            throw new Error(resendData.message || 'Gagal menghantar emel pengesahan.');
        }

        console.log(`[send-signup-verification] Emel pengesahan berjaya dihantar ke: ${email}`);
        return res.status(200).json({ success: true, message: 'Emel pengesahan telah dihantar.' });

    } catch (error) {
        console.error('[send-signup-verification] Error:', error.message);
        return res.status(500).json({ error: error.message || 'Ralat pelayan dalaman.' });
    }
});

// ==========================================
// 10. Resend Verification Email via Resend
//     (For users who didn't receive the first email)
// ==========================================
app.post('/api/resend-verification', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email || typeof email !== 'string' || !email.includes('@')) {
            return res.status(400).json({ error: 'Alamat emel tidak sah.' });
        }

        if (!supabaseAdmin) {
            throw new Error('Supabase Admin Client tidak diinisialisasi.');
        }

        const RESEND_API_KEY = process.env.RESEND_API_KEY;
        if (!RESEND_API_KEY) {
            throw new Error('RESEND_API_KEY tidak dikonfigurasi.');
        }

        // Terus jana pautan pengesahan — generateLink akan gagal sendiri jika user tak wujud
        const redirectTo = process.env.GOTRUE_SITE_URL
            ? `${process.env.GOTRUE_SITE_URL.replace(/\/$/, '')}/login`
            : 'https://jpp.cipher-node.org/login';

        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
            type: 'signup',
            email: email.trim().toLowerCase(),
            options: { redirectTo },
        });

        if (linkError) {
            console.error('[resend-verification] generateLink error:', linkError.message);
            return res.status(200).json({ success: true, message: 'Jika emel ini berdaftar, pautan pengesahan akan dihantar.' });
        }

        const verifyLink = linkData?.properties?.action_link;
        if (!verifyLink) {
            return res.status(200).json({ success: true, message: 'Jika emel ini berdaftar, pautan pengesahan akan dihantar.' });
        }

        const emailHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pengesahan Emel | JPP POLISAS</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background-color:#f4f4f5;">
    <div style="background-color:#f4f4f5;padding:40px 20px;text-align:center;">
        <table align="center" style="max-width:550px;margin:0 auto;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 25px -5px rgba(0,0,0,0.05);width:100%;border-collapse:collapse;" cellpadding="0" cellspacing="0">
            <tr>
                <td style="padding:40px 30px;text-align:center;border-bottom:1px solid #f1f5f9;background-color:#ffffff;">
                    <h1 style="color:#881B1B;font-size:26px;font-weight:900;margin:0;letter-spacing:-0.5px;">JPP POLISAS</h1>
                    <p style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:3px;margin-top:6px;font-weight:800;margin-bottom:0;">Digital Portal</p>
                </td>
            </tr>
            <tr>
                <td style="padding:40px 30px;text-align:center;background-color:#ffffff;">
                    <div style="width:64px;height:64px;background-color:#ecfdf5;border-radius:16px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:24px;">
                        <span style="font-size:32px;">📬</span>
                    </div>
                    <h2 style="color:#0f172a;font-size:22px;font-weight:800;margin:0 0 16px 0;">Pautan Pengesahan Baharu</h2>
                    <p style="color:#475569;font-size:15px;line-height:1.7;margin:0 0 12px 0;text-align:left;">
                        Anda telah meminta pautan pengesahan emel baharu untuk akaun JPP POLISAS anda.
                    </p>
                    <p style="color:#475569;font-size:15px;line-height:1.7;margin:0 0 32px 0;text-align:left;">
                        Klik butang di bawah untuk mengesahkan emel anda. Pautan ini hanya sah selama <strong>24 jam</strong>.
                    </p>
                    <div style="margin:32px 0;">
                        <a href="${verifyLink}" style="display:inline-block;background-color:#16a34a;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:16px 40px;border-radius:12px;text-transform:uppercase;letter-spacing:1.5px;box-shadow:0 4px 14px 0 rgba(22,163,74,0.35);">
                            Sahkan Emel Saya
                        </a>
                    </div>
                    <p style="color:#94a3b8;font-size:13px;line-height:1.6;margin:0;text-align:left;">
                        Jika anda tidak mendaftar akaun ini, sila abaikan emel ini.
                    </p>
                    <div style="margin-top:24px;padding:16px;background-color:#f8fafc;border-radius:10px;text-align:left;border:1px solid #e2e8f0;">
                        <p style="color:#64748b;font-size:12px;margin:0;word-break:break-all;">
                            Atau salin pautan ini ke pelayar anda:<br/>
                            <span style="color:#16a34a;font-size:11px;">${verifyLink}</span>
                        </p>
                    </div>
                </td>
            </tr>
            <tr>
                <td style="padding:24px 30px;background-color:#f8fafc;text-align:center;border-top:1px solid #f1f5f9;">
                    <p style="color:#94a3b8;font-size:12px;margin:0;font-weight:500;">&copy; ${new Date().getFullYear()} Jawatankuasa Perwakilan Pelajar POLISAS.<br/>Hak cipta terpelihara.</p>
                </td>
            </tr>
        </table>
    </div>
</body>
</html>`;

        const resendResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: 'Sistem JPP POLISAS <jpp@cipher-node.org>',
                to: email.trim().toLowerCase(),
                subject: '📬 Pautan Pengesahan Baharu — JPP POLISAS',
                html: emailHtml,
            }),
        });

        const resendData = await resendResponse.json();

        if (!resendResponse.ok) {
            console.error('[resend-verification] Resend API error:', resendData);
            throw new Error(resendData.message || 'Gagal menghantar emel pengesahan.');
        }

        console.log(`[resend-verification] Emel pengesahan dihantar semula ke: ${email}`);
        return res.status(200).json({ success: true, message: 'Pautan pengesahan baharu telah dihantar ke emel anda.' });

    } catch (error) {
        console.error('[resend-verification] Error:', error.message);
        return res.status(500).json({ error: error.message || 'Ralat pelayan dalaman.' });
    }
});

// ==========================================
// Serve Static Frontend (Vite Build)
// ==========================================
// After building the Vite app, it outputs to 'dist'. We serve it here.
app.use(express.static(path.join(__dirname, 'dist')));

// SPA Fallback: Any route not matched by API or static files will return index.html
app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api/')) {
        res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    } else {
        next();
    }
});

app.listen(port, () => {
    console.log(`[JPP-POLISAS] Server is running on port ${port}`);
});
