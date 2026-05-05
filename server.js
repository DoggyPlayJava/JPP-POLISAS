import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

import cron from 'node-cron';
import runCleanup from './scripts/storage-cleanup.js';

dotenv.config();

// ==========================================
// BACKGROUND CRON JOBS
// ==========================================
// Run storage cleanup every day at 02:00 AM
cron.schedule('0 2 * * *', () => {
    console.log('[CRON] Starting daily storage cleanup job...');
    runCleanup();
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.set('trust proxy', true); // Membaca IP sebenar student dari Cloudflare/Traefik
const port = process.env.PORT || 8000;

// ==========================================
// Security Headers (Helmet)
// ==========================================
app.use(helmet({
    contentSecurityPolicy: false, // Disabled for SPA — CSP set at reverse-proxy level
    crossOriginEmbedderPolicy: false, // Allow external images/fonts
}));

// ==========================================
// CORS — restricted to production & local dev only
// ==========================================
const ALLOWED_ORIGINS = [
    'https://jpp.cipher-node.org',
    'https://www.jpp.cipher-node.org',
    'http://localhost:5173',
    'http://localhost:8000',
];
app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, Postman, server-to-server)
        if (!origin || ALLOWED_ORIGINS.includes(origin)) {
            callback(null, true);
        } else {
            console.warn(`[CORS] Blocked request from origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-webhook-secret'],
    credentials: true,
}));

// ==========================================
// LAPISAN 1: Global IP Rate Limiter
// Melindungi SEMUA endpoint dari DDoS & bot flood
// Nilai tinggi kerana limit sebenar dibuat di lapisan 2
// ==========================================
const globalRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minit
    max: 1000, // 1000 req per 15 min per IP (catch DDoS, bukan pelajar biasa)
    message: { error: 'Terlalu banyak permintaan daripada IP ini. Sila cuba lagi selepas 15 minit.' },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(globalRateLimiter);

// Body parsers — with explicit size limits
app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: true, limit: '50kb' }));

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
        console.error("FATAL: WEBHOOK_SECRET is not set. Webhook endpoints are disabled for security.");
        return res.status(503).json({ error: "Webhook endpoint unavailable: server misconfigured." });
    }
    
    if (secret !== expectedSecret) {
        return res.status(401).json({ error: "Unauthorized: Invalid webhook secret." });
    }
    next();
};

// ==========================================
// LAPISAN 2A: IP-Based Limiters
// Untuk endpoint TANPA LOGIN sahaja (reset-password, signup)
// Bot tidak ada JWT, jadi kena tapis di sini
// ==========================================
const authFlowLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 jam
    max: 5, // 5 percubaan per jam per IP — mencukupi untuk guna sebenar
    message: { error: "Terlalu banyak percubaan. Sila cuba lagi selepas 1 jam." },
    standardHeaders: true,
    legacyHeaders: false,
});

// ==========================================
// LAPISAN 2B: User-ID-Based Limiters
// Untuk endpoint PERLUKAN LOGIN — adil untuk semua pelajar
// termasuk yang kongsi WiFi kampus (NAT IP yang sama)
// Bots tidak boleh sampai sini tanpa JWT yang sah
// ==========================================

/**
 * Factory function untuk cipta rate limiter berdasarkan User ID (bukan IP)
 * @param {number} maxRequests - Maksimum request per window
 * @param {number} windowMinutes - Saiz window dalam minit
 * @param {string} errorMessage - Mesej ralat Bahasa Melayu
 */
function createUserRateLimiter(maxRequests, windowMinutes, errorMessage) {
    return rateLimit({
        windowMs: windowMinutes * 60 * 1000,
        max: maxRequests,
        // Guna user ID sebagai kunci — lebih adil untuk WiFi kampus
        // Fallback ke IP jika user ID tiada (seharusnya tidak berlaku pada endpoint requireAuth)
        keyGenerator: (req) => req.user?.id || req.ip,
        message: { error: errorMessage },
        standardHeaders: true,
        legacyHeaders: false,
    });
}

// Limit untuk hantar emel — 15 emel per 15 min per pengguna
const emailSendLimiter = createUserRateLimiter(
    15,
    15,
    'Terlalu banyak emel dihantar. Sila cuba lagi selepas 15 minit.'
);

// Limit untuk AI assistant — 50 req per 15 min per pengguna
const aiRateLimiter = createUserRateLimiter(
    50,
    15,
    'Terlalu banyak permintaan AI. Sila cuba lagi selepas 15 minit.'
);

// Limit untuk anomaly notify — 10 req per 15 min per pengguna
const anomalyNotifyLimiter = createUserRateLimiter(
    10,
    15,
    'Terlalu banyak amaran anomali. Sila cuba lagi selepas 15 minit.'
);

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
app.post('/api/send-email', requireAuth, emailSendLimiter, async (req, res) => {
    try {
        const { to, subject, html } = req.body;

        if (!to || !subject || !html) {
            return res.status(400).json({ error: "Missing required parameters: to, subject, html" });
        }

        // SECURITY: Validate recipient domain — only allow university & system domains
        const ALLOWED_EMAIL_DOMAINS = ['polisas.edu.my', 'cipher-node.org', 'gmail.com'];
        const recipients = Array.isArray(to) ? to : [to];
        for (const addr of recipients) {
            const domain = String(addr).split('@')[1]?.toLowerCase();
            if (!domain || !ALLOWED_EMAIL_DOMAINS.includes(domain)) {
                return res.status(403).json({ error: `Domain emel '${domain}' tidak dibenarkan.` });
            }
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

        // SECURITY: Validate both MIME type AND file extension
        if (file.mimetype !== "application/pdf") {
            return res.status(400).json({ error: "Hanya fail PDF sahaja dibenarkan." });
        }
        if (!file.originalname.toLowerCase().endsWith('.pdf')) {
            return res.status(400).json({ error: "Nama fail mesti berakhiran .pdf" });
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
app.post('/api/notify-anomaly', requireAuth, anomalyNotifyLimiter, async (req, res) => {
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
                    ${alerts.map(a => {
                        const safeUser = String(a.user || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                        const safeReason = String(a.reason || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                        return `<tr><td>${safeUser}</td><td>${safeReason}</td></tr>`;
                    }).join('')}
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
app.post('/api/reset-password', authFlowLimiter, async (req, res) => {
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
app.post('/api/send-signup-verification', authFlowLimiter, async (req, res) => {
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
app.post('/api/resend-verification', authFlowLimiter, async (req, res) => {
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
// KLK — Kediaman Luar Kampus Endpoints
// ==========================================

// Shared field map — case-insensitive normalization
const KLK_FIELD_MAP = {
    'nama pelajar':             'nama_pelajar',
    'nama':                     'nama_pelajar',
    'no matriks':               'no_matrik',
    'no. matriks':              'no_matrik',
    'no matrik':                'no_matrik',
    'matrik':                   'no_matrik',
    'no telefon':               'no_telefon',
    'no. telefon':              'no_telefon',
    'telefon':                  'no_telefon',
    'phone':                    'no_telefon',
    'jabatan':                  'jabatan',
    'program':                  'jabatan',
    'alamat kediaman':          'alamat_kediaman',
    'alamat':                   'alamat_kediaman',
    'kawasan kediaman':         'kawasan_kediaman',
    'kawasan':                  'kawasan_kediaman',
    'cadangan/penambahbaikan':  'cadangan',
    'cadangan':                 'cadangan',
    'penambahbaikan':           'cadangan',
};

function klkGetAcademicYear() {
    const now = new Date();
    const y = now.getFullYear();
    return now.getMonth() >= 6 ? `${y}/${y + 1}` : `${y - 1}/${y}`;
}

// Rate limiter khusus untuk webhook (lebih longgar — dari Google Apps Script)
const klkWebhookLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    message: { error: 'Webhook rate limit exceeded.' },
});

// ── KLK Endpoint 1: Google Form Webhook ─────────────────────────────────────
// POST /api/klk-webhook
// Dipanggil oleh Google Apps Script setiap kali ada form submission
app.post('/api/klk-webhook', klkWebhookLimiter, async (req, res) => {
    try {
        if (!supabaseAdmin) throw new Error('Supabase Admin tidak diinisialisasi.');

        // 1. Verify KLK-specific webhook secret
        const secret = req.headers['x-webhook-secret'];
        const expectedSecret = process.env.KLK_WEBHOOK_SECRET;
        if (!expectedSecret) {
            console.error('[klk-webhook] KLK_WEBHOOK_SECRET tidak dikonfigurasi.');
            return res.status(503).json({ error: 'Webhook tidak tersedia: server tidak dikonfigurasi.' });
        }
        if (secret !== expectedSecret) {
            return res.status(401).json({ error: 'Unauthorized: Secret tidak sah.' });
        }

        // 2. Map fields dari Google Form payload
        const raw = req.body;
        const record = {
            source: 'GOOGLE_FORM',
            tinggal_luar: true,
            extra_data: {},
            academic_year: klkGetAcademicYear(),
        };
        const unknownFields = {};

        for (const [key, value] of Object.entries(raw)) {
            const normalized = key.toLowerCase().trim();
            // Skip metadata fields
            if (['timestamp', 'email address', 'email', 'cap masa'].includes(normalized)) continue;
            
            const dbCol = KLK_FIELD_MAP[normalized];
            if (dbCol) {
                record[dbCol] = String(value || '').trim();
            } else {
                unknownFields[key] = value;
            }
        }

        record.extra_data = unknownFields;

        // 3. Normalize & validate
        if (!record.nama_pelajar) {
            return res.status(400).json({ error: 'Nama pelajar diperlukan.' });
        }
        if (record.no_matrik) record.no_matrik = record.no_matrik.toUpperCase().trim();
        if (record.nama_pelajar) record.nama_pelajar = record.nama_pelajar.toUpperCase().trim();

        // 4. Try link user_id dari profiles table
        if (record.no_matrik) {
            const { data: profile } = await supabaseAdmin
                .from('profiles')
                .select('id, intake_year, intake_period, programme_code')
                .ilike('matric_no', record.no_matrik)
                .maybeSingle();

            if (profile) {
                record.user_id = profile.id;
                // Boleh calculate semester dari profile jika perlu
            }
        }

        // 5. Insert ke DB (service_role bypass RLS)
        const { data: inserted, error: insertErr } = await supabaseAdmin
            .from('klk_student_residency')
            .upsert(record, {
                onConflict: 'user_id,academic_year,semester',
                ignoreDuplicates: false,
            })
            .select('id')
            .single();

        if (insertErr) {
            console.error('[klk-webhook] Insert error:', insertErr.message);
            return res.status(500).json({ error: insertErr.message });
        }

        // 6. Log sync
        await supabaseAdmin.from('klk_sync_log').insert({
            source: 'GOOGLE_FORM',
            total_rows: 1,
            success: 1,
            failed: 0,
        });

        // 7. Alert Exco KLS jika ada field baru tidak dikenali
        const unknownKeys = Object.keys(unknownFields);
        if (unknownKeys.length > 0) {
            const list = unknownKeys.join(', ');
            console.warn(`[klk-webhook] Field tidak dikenali dikesan: ${list}`);
            
            // Notify dalam-app ke semua Exco KLS + SUPER_ADMIN
            const { data: excos } = await supabaseAdmin
                .from('profiles')
                .select('id')
                .or('role.eq.SUPER_ADMIN_JPP,and(role.eq.JPP,jpp_unit.eq.KLS)');

            if (excos?.length) {
                const notifs = excos.map(e => ({
                    user_id: e.id,
                    title: '⚠️ KLK: Field Baru Dari Google Form',
                    body: `Submission Google Form mengandungi field tidak dikenali: ${list}. Data disimpan dalam extra_data. Sila semak Tab Form Builder dalam Tetapan KLK.`,
                    type: 'WARNING',
                    link: '/klk/tetapan',
                }));
                await supabaseAdmin.from('notifications').insert(notifs);
            }
        }

        console.log(`[klk-webhook] Submission berjaya: ${record.no_matrik || 'unknown'}`);
        return res.status(200).json({ success: true, id: inserted?.id });

    } catch (err) {
        console.error('[klk-webhook] Unexpected error:', err.message);
        return res.status(500).json({ error: err.message });
    }
});

// ── KLK Endpoint 2: CSV Import ───────────────────────────────────────────────
// POST /api/klk-csv-import  (multipart/form-data, field name: 'csv')
// Untuk import data lama dari Google Sheets / Google Form export
app.post('/api/klk-csv-import', requireAuth, upload.single('csv'), async (req, res) => {
    try {
        if (!supabaseAdmin) throw new Error('Supabase Admin tidak diinisialisasi.');

        // RBAC: Hanya Exco KLS + SUPER_ADMIN
        const { data: callerProfile } = await supabaseAdmin
            .from('profiles')
            .select('role, jpp_unit')
            .eq('id', req.user.id)
            .single();

        const isAuthorized = callerProfile?.role === 'SUPER_ADMIN_JPP' ||
            (callerProfile?.role === 'JPP' && callerProfile?.jpp_unit === 'KLS');

        if (!isAuthorized) {
            return res.status(403).json({ error: 'Akses tidak dibenarkan. Hanya Exco KLS sahaja.' });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'Fail CSV diperlukan.' });
        }

        // Validate file type
        if (!req.file.originalname.toLowerCase().endsWith('.csv')) {
            return res.status(400).json({ error: 'Hanya fail .csv dibenarkan.' });
        }

        const csvText = req.file.buffer.toString('utf8');
        const academicYear = klkGetAcademicYear();

        // Parse CSV manually (tanpa papaparse — gunakan built-in parsing)
        const lines = csvText.split(/\r?\n/).filter(l => l.trim());
        if (lines.length < 2) {
            return res.status(400).json({ error: 'Fail CSV kosong atau tidak mengandungi data.' });
        }

        // Parse header baris pertama (case-insensitive)
        const rawHeaders = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());
        const headers = rawHeaders.map(h => h.toLowerCase());

        const results = { inserted: 0, updated: 0, failed: 0, errors: [] };
        const batch = [];

        for (let i = 1; i < lines.length; i++) {
            try {
                // Handle quoted CSV values
                const values = lines[i].match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g)
                    ?.map(v => v.replace(/^"|"$/g, '').trim()) ?? lines[i].split(',');

                if (values.length < 2) continue;

                const row = {};
                headers.forEach((h, idx) => { row[h] = values[idx] ?? ''; });

                const record = {
                    source: 'CSV_IMPORT',
                    tinggal_luar: true,
                    extra_data: {},
                    academic_year: academicYear,
                };

                // Map fields
                for (const [key, value] of Object.entries(row)) {
                    const dbCol = KLK_FIELD_MAP[key];
                    if (dbCol) {
                        record[dbCol] = String(value || '').trim();
                    } else if (!['timestamp', 'email', 'email address', 'cap masa'].includes(key)) {
                        record.extra_data[key] = value;
                    }
                }

                if (!record.nama_pelajar) {
                    results.failed++;
                    results.errors.push(`Baris ${i + 1}: nama_pelajar kosong`);
                    continue;
                }

                if (record.no_matrik) record.no_matrik = record.no_matrik.toUpperCase().trim();
                if (record.nama_pelajar) record.nama_pelajar = record.nama_pelajar.toUpperCase().trim();

                // Try link user_id
                if (record.no_matrik) {
                    const { data: p } = await supabaseAdmin
                        .from('profiles').select('id').ilike('matric_no', record.no_matrik).maybeSingle();
                    if (p) record.user_id = p.id;
                }

                batch.push(record);
            } catch (rowErr) {
                results.failed++;
                results.errors.push(`Baris ${i + 1}: ${rowErr.message}`);
            }
        }

        // Batch insert (chunks of 50 untuk elak timeout)
        const CHUNK_SIZE = 50;
        for (let i = 0; i < batch.length; i += CHUNK_SIZE) {
            const chunk = batch.slice(i, i + CHUNK_SIZE);
            const { data: inserted, error: insertErr } = await supabaseAdmin
                .from('klk_student_residency')
                .upsert(chunk, { onConflict: 'user_id,academic_year,semester', ignoreDuplicates: false })
                .select('id');

            if (insertErr) {
                console.error(`[klk-csv-import] Chunk ${i} error:`, insertErr.message);
                results.failed += chunk.length;
                results.errors.push(`Chunk ${Math.floor(i / CHUNK_SIZE) + 1}: ${insertErr.message}`);
            } else {
                results.inserted += inserted?.length ?? 0;
            }
        }

        // Log sync
        await supabaseAdmin.from('klk_sync_log').insert({
            source: 'CSV_IMPORT',
            total_rows: batch.length + results.failed,
            success: results.inserted,
            failed: results.failed,
            error_log: results.errors.length > 0 ? results.errors : null,
            synced_by: req.user.id,
        });

        console.log(`[klk-csv-import] Selesai: ${results.inserted} berjaya, ${results.failed} gagal`);
        return res.status(200).json({
            success: true,
            inserted: results.inserted,
            failed: results.failed,
            errors: results.errors.slice(0, 10), // maksimum 10 error dalam response
        });

    } catch (err) {
        console.error('[klk-csv-import] Unexpected error:', err.message);
        return res.status(500).json({ error: err.message });
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
