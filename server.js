import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
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
    'http://localhost:3000',
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
    validate: { xForwardedForHeader: false, trustProxy: false, default: false },
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
    validate: { xForwardedForHeader: false, trustProxy: false, default: false },
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
        validate: { xForwardedForHeader: false, trustProxy: false, default: false },
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
// 5B. Parse CGPA from PDF (Server-Side)
// iOS WebKit cannot run pdfjs-dist client-side — this
// endpoint does the extraction on the server instead.
// ==========================================
app.post('/api/parse-cgpa-pdf', requireAuth, upload.single('file'), async (req, res) => {
    try {
        const file = req.file;
        if (!file) {
            return res.status(400).json({ error: "Fail PDF tidak ditemui." });
        }

        // Accept PDF by mime OR extension (mobile browsers unreliable)
        const isPdf = file.mimetype === 'application/pdf' ||
            file.originalname?.toLowerCase().endsWith('.pdf');
        if (!isPdf) {
            return res.status(400).json({ error: "Hanya fail PDF sahaja." });
        }

        // Dynamic import pdfjs-dist (ESM)
        const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');

        const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(file.buffer) }).promise;

        let fullText = '';
        for (let i = 1; i <= Math.min(pdf.numPages, 5); i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            fullText += content.items.map(item => item.str).join(' ') + '\n';
        }

        if (fullText.trim().length < 20) {
            return res.status(200).json({ hpnm: null, pnm: null, semester: null, tahun: null, scanFailed: true });
        }

        // Normalize split decimals
        let text = fullText.replace(/\s+/g, ' ').toUpperCase();
        text = text.replace(/(\d)\s+\.\s*(\d)/g, '$1.$2');
        text = text.replace(/(\d)\.\s+(\d)/g, '$1.$2');

        console.log('[parse-cgpa-pdf] Normalized (first 500):', text.substring(0, 500));

        // Semester detection
        const semWordMap = { 'SATU': 1, 'DUA': 2, 'TIGA': 3, 'EMPAT': 4, 'LIMA': 5, 'ENAM': 6, 'TUJUH': 7, 'LAPAN': 8, 'SEMBILAN': 9 };
        let semester = null;
        for (const p of [/SEMESTER\s*[:\-]?\s*([1-9])/, /SEM(?:ESTER)?\s*[:\-]?\s*([1-9])/, /SEM\.?\s*([1-9])\b/]) {
            const m = text.match(p);
            if (m) { semester = parseInt(m[1]); break; }
        }
        if (!semester) {
            const sw = text.match(/SEMESTER\s*[:\-]?\s*(SATU|DUA|TIGA|EMPAT|LIMA|ENAM|TUJUH|LAPAN|SEMBILAN)/);
            if (sw) semester = semWordMap[sw[1]] ?? null;
        }
        if (!semester) {
            const sm = text.match(/SESI\s+(I{1,3}|IV|V?I{0,3})\s*[:\s]/);
            if (sm) {
                const roman = { 'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5, 'VI': 6 };
                semester = roman[sm[1].trim()] ?? null;
            }
        }

        // Tahun
        let tahun = null;
        for (const p of [/SESI\s+[IVX]+\s*[:\-]?\s*(\d{4}\s*\/\s*\d{4})/, /SESI\s*(\d{4}\s*\/\s*\d{4})/, /(\d{4}\s*\/\s*\d{4})/, /(\d{4}-\d{4})/]) {
            const m = text.match(p);
            if (m) { tahun = m[1].replace(/\s/g, ''); break; }
        }

        // KEPUTUSAN zone
        const keputusanIdx = text.indexOf('KEPUTUSAN');
        const keputusanZone = keputusanIdx >= 0 ? text.slice(keputusanIdx) : '';

        // Pass 1: Labeled patterns
        let hpnm = null, pnm = null;
        const hpnmPats = [/HPNM\s*[:\-=]?\s*(\d\.\d{2})/, /H\.?P\.?N\.?M\.?\s*[:\-=]?\s*(\d\.\d{2})/, /CGPA\s*[:\-=]?\s*(\d\.\d{2,4})/];
        const pnmPats = [/PNM\s*[:\-=]?\s*(\d\.\d{2})/, /P\.?N\.?M\.?\s*[:\-=]?\s*(\d\.\d{2})/, /GPA\s+SEMESTER\s*[:\-=]?\s*(\d\.\d{2})/];

        for (const p of hpnmPats) { const m = text.match(p); if (m) { const v = parseFloat(m[1]); if (v >= 0 && v <= 4.0) { hpnm = v; break; } } }
        for (const p of pnmPats) { const m = text.match(p); if (m) { const v = parseFloat(m[1]); if (v >= 0 && v <= 4.0) { pnm = v; break; } } }

        // Pass 2: KEPUTUSAN zone
        if ((!hpnm || !pnm) && keputusanZone) {
            if (!pnm) { const pm = keputusanZone.match(/PNM\s*[:\-=]?\s*(\d\.\d{2})/); if (pm) { const v = parseFloat(pm[1]); if (v >= 0 && v <= 4.0) pnm = v; } }
            if (!hpnm) { const hm = keputusanZone.match(/HPNM\s*[:\-=]?\s*(\d\.\d{2})/); if (hm) { const v = parseFloat(hm[1]); if (v >= 0 && v <= 4.0) hpnm = v; } }
            if (!hpnm || !pnm) {
                const decimals = [...keputusanZone.matchAll(/\b([0-4]\.\d{2})\b/g)].map(m => parseFloat(m[1])).filter(v => v >= 0 && v <= 4.0);
                if (decimals.length >= 2) { if (!pnm) pnm = decimals[0]; if (!hpnm) hpnm = decimals[1]; }
                else if (decimals.length === 1 && !hpnm) hpnm = decimals[0];
            }
        }

        console.log('[parse-cgpa-pdf] Result:', { hpnm, pnm, semester, tahun });
        return res.status(200).json({ hpnm, pnm, semester, tahun, scanFailed: false });

    } catch (error) {
        console.error("[parse-cgpa-pdf] Error:", error.message);
        return res.status(500).json({ error: error.message, hpnm: null, pnm: null, semester: null, tahun: null, scanFailed: true });
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
            icon: req.body.icon || '/icon-192-maskable.png',
            badge: req.body.badge || '/icon-192-maskable.png', // Terbaik jika guna icon monokrom lutsinar khas
            image: req.body.image, // URL gambar banner besar (opsional)
            actions: req.body.actions, // Array objek {action, title, icon} (opsional)
            tag: req.body.tag || 'jpp-notification', // Kumpulan notifikasi lalai
            renotify: req.body.renotify !== undefined ? req.body.renotify : true
        });

        const result = await webpush.sendNotification(subscription, payload);

        return res.status(200).json({ success: true, result });
    } catch (error) {
        console.error("[send-push-notification] Error:", error.message);
        return res.status(500).json({ error: error.message });
    }
});

// ==========================================
// 6b. PolyRider Targeted Push Notification
// Hantar kepada senarai userIds yang spesifik
// Lebih efisyen: semak semua device setiap user
// ==========================================
app.post('/api/polyrider-notify', requireAuth, async (req, res) => {
    try {
        if (!supabaseAdmin) throw new Error('Supabase Admin Client not initialized.');

        const { userIds, title, body, tag, url, icon } = req.body;

        if (!Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({ error: 'userIds[] diperlukan.' });
        }
        if (!title) return res.status(400).json({ error: 'title diperlukan.' });

        const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:jpp@cipher-node.org';
        const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
        const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

        if (!vapidPublicKey || !vapidPrivateKey) {
            throw new Error('VAPID keys belum dikonfigurasi.');
        }
        webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

        // Fetch ALL subscriptions for target users (multi-device aware)
        const { data: subs, error: subsError } = await supabaseAdmin
            .from('push_subscriptions')
            .select('id, user_id, endpoint, p256dh, auth')
            .in('user_id', userIds);

        if (subsError) throw new Error(subsError.message);
        if (!subs || subs.length === 0) {
            return res.status(200).json({ success: true, sent: 0, message: 'Tiada subscription.' });
        }

        const payload = JSON.stringify({
            title,
            body: body || '',
            icon: icon || '/icon-192-maskable.png',
            badge: '/icon-192-maskable.png',
            tag: tag || 'polyrider',
            renotify: true,
            requireInteraction: false,
            data: { url: url || '/polyrider' },
        });

        let sent = 0;
        let failed = 0;
        const staleIds = [];

        await Promise.allSettled(
            subs.map(async (sub) => {
                const subscription = {
                    endpoint: sub.endpoint,
                    keys: { p256dh: sub.p256dh, auth: sub.auth },
                };
                try {
                    await webpush.sendNotification(subscription, payload);
                    sent++;
                } catch (e) {
                    failed++;
                    // 410 Gone = subscription expired, remove it
                    if (e.statusCode === 410) staleIds.push(sub.id);
                    console.warn(`[polyrider-notify] Sub failed (${e.statusCode}): ${sub.endpoint.slice(-20)}`);
                }
            })
        );

        // Cleanup stale subscriptions
        if (staleIds.length > 0) {
            await supabaseAdmin.from('push_subscriptions').delete().in('id', staleIds);
            console.log(`[polyrider-notify] Removed ${staleIds.length} stale subscription(s).`);
        }

        console.log(`[polyrider-notify] "${title}" → Sent: ${sent}/${subs.length}, Failed: ${failed}, Users: ${userIds.length}`);
        return res.status(200).json({ success: true, sent, failed, total: subs.length });

    } catch (error) {
        console.error('[polyrider-notify] Error:', error.message);
        return res.status(500).json({ error: error.message });
    }
});

// ==========================================
// 6c. PolySuara New Confession Webhook Notification
// Dicetuskan oleh Supabase Database Webhook pada INSERT
// ke jadual `polysuara_confessions`.
// Hantar push notification kepada SEMUA subscriber
// yang BUKAN author dan BELUM opt-out.
// Push-only (tiada insert ke jadual notifications)
// untuk elak membanjiri DB dengan N rows per confession.
// ==========================================
app.post('/api/polysuara-new-confession-notify', requireWebhookSecret, async (req, res) => {
    try {
        if (!supabaseAdmin) throw new Error('Supabase Admin Client not initialized.');

        const payload = req.body;

        // Hanya proses INSERT events
        if (payload.type !== 'INSERT') {
            return res.status(200).send('Not an INSERT event.');
        }

        const { author_id, category } = payload.record;

        if (!author_id) {
            return res.status(400).json({ error: 'Missing author_id in webhook payload.' });
        }

        const confessionCategory = category || 'UMUM';

        const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:jpp@cipher-node.org';
        const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
        const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

        if (!vapidPublicKey || !vapidPrivateKey) {
            console.warn('[polysuara-notify] VAPID keys not configured. Skipping push.');
            return res.status(200).json({ success: true, sent: 0, message: 'VAPID not configured.' });
        }
        webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

        // 1. Fetch opt-out users
        const { data: optOutRows } = await supabaseAdmin
            .from('polysuara_notif_optout')
            .select('user_id');
        const optOutIds = new Set(optOutRows?.map(r => r.user_id) || []);

        // 2. Fetch ALL push subscriptions (service role bypasses RLS)
        const { data: allSubs, error: subsError } = await supabaseAdmin
            .from('push_subscriptions')
            .select('id, user_id, endpoint, p256dh, auth');

        if (subsError) throw new Error(subsError.message);
        if (!allSubs || allSubs.length === 0) {
            return res.status(200).json({ success: true, sent: 0, message: 'Tiada subscription.' });
        }

        // 3. Filter: exclude author + opted-out
        const eligibleSubs = allSubs.filter(
            sub => sub.user_id !== author_id && !optOutIds.has(sub.user_id)
        );

        if (eligibleSubs.length === 0) {
            return res.status(200).json({ success: true, sent: 0, message: 'Tiada subscriber eligible.' });
        }

        const pushPayload = JSON.stringify({
            title: '👻 Luahan Baru di PolySuara',
            body: `Ada confession baru dalam kategori ${confessionCategory}. Jom tengok!`,
            icon: '/icon-192-maskable.png',
            badge: '/icon-192-maskable.png',
            tag: 'polysuara-new-confession',
            renotify: true,
            requireInteraction: false,
            data: { url: '/polysuara', link: '/polysuara', module: 'POLYSUARA', type: 'NEW_CONFESSION' },
        });

        let sent = 0;
        let failed = 0;
        const staleIds = [];

        // Process in batches of 20
        const BATCH_SIZE = 20;
        for (let i = 0; i < eligibleSubs.length; i += BATCH_SIZE) {
            const batch = eligibleSubs.slice(i, i + BATCH_SIZE);
            await Promise.allSettled(
                batch.map(async (sub) => {
                    const subscription = {
                        endpoint: sub.endpoint,
                        keys: { p256dh: sub.p256dh, auth: sub.auth },
                    };
                    try {
                        await webpush.sendNotification(subscription, pushPayload);
                        sent++;
                    } catch (e) {
                        failed++;
                        if (e.statusCode === 410) staleIds.push(sub.id);
                    }
                })
            );
        }

        // Cleanup stale subscriptions
        if (staleIds.length > 0) {
            await supabaseAdmin.from('push_subscriptions').delete().in('id', staleIds);
            console.log(`[polysuara-notify] Removed ${staleIds.length} stale subscription(s).`);
        }

        console.log(`[polysuara-notify] "${confessionCategory}" → Sent: ${sent}/${eligibleSubs.length}, Failed: ${failed}, OptOut: ${optOutIds.size}`);
        return res.status(200).json({ success: true, sent, failed, total: eligibleSubs.length });

    } catch (error) {
        console.error('[polysuara-notify] Error:', error.message);
        return res.status(500).json({ error: error.message });
    }
});

// ==========================================
// 7. PolyRider SOS Alert Endpoint
// Prioriti KRITIKAL: Dihantar kepada semua KLK & SUPER_ADMIN_JPP

// ==========================================
const sosRateLimiter = createUserRateLimiter(
    5,   // max 5 SOS per user per 15 min (elak spam)
    15,
    'Terlalu banyak isyarat SOS. Sila hubungi KLK secara terus.'
);

app.post('/api/polyrider-sos', requireAuth, sosRateLimiter, async (req, res) => {
    try {
        if (!supabaseAdmin) throw new Error('Supabase Admin Client not initialized.');

        const { sosId, jobId, lat, lng, userName, userMatric, riderName, plateNumber } = req.body;

        if (!sosId || !jobId) {
            return res.status(400).json({ error: 'sosId dan jobId diperlukan.' });
        }

        const triggeredAt = new Date().toLocaleString('ms-MY', {
            timeZone: 'Asia/Kuala_Lumpur',
            dateStyle: 'short',
            timeStyle: 'medium',
        });

        // Build location info
        const mapsLink = (lat && lng)
            ? `https://maps.google.com/?q=${lat},${lng}`
            : null;
        const locationText = mapsLink
            ? `<a href="${mapsLink}" style="color:#dc2626">📍 Buka di Google Maps</a>`
            : '📍 Lokasi tidak tersedia (GPS dimatikan)';

        // Build push payload
        const pushTitle = '🚨 SOS POLYRIDER — KECEMASAN!';
        const pushBody = `${userName || 'Pelajar'} memerlukan bantuan segera!${riderName ? ` Rider: ${riderName} (${plateNumber})` : ''}`;

        // Build email HTML
        const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fff; border: 2px solid #dc2626; border-radius: 12px; overflow: hidden;">
          <div style="background: #dc2626; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🚨 SOS KECEMASAN</h1>
            <p style="color: #fca5a5; margin: 4px 0 0 0; font-size: 14px;">PolyRider — Sistem E-Hailing POLISAS</p>
          </div>
          <div style="padding: 24px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 10px 0; border-bottom: 1px solid #fee2e2; color: #6b7280; width: 140px; font-size: 13px;">Pelajar</td><td style="padding: 10px 0; border-bottom: 1px solid #fee2e2; font-weight: bold;">${userName || 'Tidak diketahui'}</td></tr>
              <tr><td style="padding: 10px 0; border-bottom: 1px solid #fee2e2; color: #6b7280; font-size: 13px;">No. Matrik</td><td style="padding: 10px 0; border-bottom: 1px solid #fee2e2; font-weight: bold;">${userMatric || '-'}</td></tr>
              ${riderName ? `<tr><td style="padding: 10px 0; border-bottom: 1px solid #fee2e2; color: #6b7280; font-size: 13px;">Rider</td><td style="padding: 10px 0; border-bottom: 1px solid #fee2e2; font-weight: bold;">${riderName} • ${plateNumber || '-'}</td></tr>` : ''}
              <tr><td style="padding: 10px 0; border-bottom: 1px solid #fee2e2; color: #6b7280; font-size: 13px;">Lokasi GPS</td><td style="padding: 10px 0; border-bottom: 1px solid #fee2e2;">${locationText}</td></tr>
              <tr><td style="padding: 10px 0; color: #6b7280; font-size: 13px;">Masa</td><td style="padding: 10px 0; font-weight: bold;">${triggeredAt}</td></tr>
            </table>
            <div style="margin-top: 24px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px;">
              <p style="margin: 0; color: #991b1b; font-weight: bold;">⚠️ Tindakan Segera Diperlukan</p>
              <p style="margin: 8px 0 0 0; color: #dc2626; font-size: 14px;">Sila hubungi pelajar atau rider dengan serta-merta dan ambil tindakan kecemasan yang sewajarnya.</p>
            </div>
          </div>
          <div style="background: #f9fafb; padding: 12px 24px; text-align: center; color: #9ca3af; font-size: 12px;">
            Isyarat SOS ini dihantar automatik oleh Sistem PolyRider JPP-POLISAS
          </div>
        </div>`;

        // 1. Fetch all push subscriptions for KLK and SUPER_ADMIN_JPP
        const { data: klkProfiles } = await supabaseAdmin
            .from('profiles')
            .select('id, email, full_name')
            .in('role', ['KLK', 'SUPER_ADMIN_JPP']);

        const klkIds = (klkProfiles || []).map(p => p.id);
        const klkEmails = (klkProfiles || []).map(p => p.email).filter(Boolean);

        let pushCount = 0;
        let emailCount = 0;

        // 2. Send push notifications
        if (klkIds.length > 0) {
            const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
            const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
            const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:jpp@cipher-node.org';

            if (vapidPublicKey && vapidPrivateKey) {
                webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

                const { data: subs } = await supabaseAdmin
                    .from('push_subscriptions')
                    .select('subscription')
                    .in('user_id', klkIds);

                const pushPayload = JSON.stringify({
                    title: pushTitle,
                    body: pushBody,
                    icon: '/icon-192-maskable.png',
                    badge: '/icon-192-maskable.png',
                    tag: `sos-${sosId}`,
                    renotify: true,
                    data: { url: '/polyrider/admin', sosId, jobId },
                    actions: mapsLink ? [{ action: 'map', title: '📍 Lokasi' }] : [],
                    requireInteraction: true, // Notifikasi tidak auto-hilang
                    vibrate: [200, 100, 200, 100, 200], // Pattern denyut kecemasan
                });

                await Promise.allSettled(
                    (subs || []).map(s => webpush.sendNotification(s.subscription, pushPayload))
                );
                pushCount = (subs || []).length;
            }
        }

        // 3. Send email alerts
        const RESEND_API_KEY = process.env.RESEND_API_KEY;
        if (RESEND_API_KEY && klkEmails.length > 0) {
            sendEmailInternal(
                klkEmails,
                `🚨 SOS PolyRider — ${userName || 'Pelajar'} memerlukan bantuan!`,
                emailHtml
            ).catch(err => console.error('[polyrider-sos] Email error:', err.message));
            emailCount = klkEmails.length;
        }

        console.log(`[polyrider-sos] SOS ${sosId} — push: ${pushCount}, email: ${emailCount}`);

        return res.status(200).json({
            success: true,
            pushSent: pushCount,
            emailSent: emailCount,
            recipients: klkProfiles?.map(p => p.full_name) || [],
        });
    } catch (err) {
        console.error('[polyrider-sos] Error:', err.message);
        return res.status(500).json({ error: err.message });
    }
});

// ==========================================
// 8. Notify Anomaly Endpoint
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
    validate: { xForwardedForHeader: false, trustProxy: false, default: false },
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
// 11. System Telemetry (SUPER_ADMIN_JPP Only)
// Returns Node.js runtime metrics + module row counts
// ==========================================
app.get('/api/system-telemetry', requireAuth, async (req, res) => {
    try {
        if (!supabaseAdmin) throw new Error('Supabase Admin not initialized.');

        // RBAC: Only SUPER_ADMIN_JPP
        const { data: callerProfile } = await supabaseAdmin
            .from('profiles').select('role').eq('id', req.user.id).single();
        if (callerProfile?.role !== 'SUPER_ADMIN_JPP') {
            return res.status(403).json({ error: 'Akses ditolak. Hanya SUPER_ADMIN_JPP.' });
        }

        // ── Server metrics ──
        const memUsage = process.memoryUsage();
        const cpuUsage = process.cpuUsage();
        const uptimeSeconds = process.uptime();

        // ── Module row counts (parallel queries) ──
        const [
            profilesRes, clubsRes, clubActRes, clubRepRes, clubMemRes,
            kebajikanRes, kebajikanCommentsRes,
            polymartOrdersRes, polymartReviewsRes, polymartReportsRes,
            prJobsRes, prBidsRes, prSosRes,
            bizRes, bizProdRes, bizTxRes,
            supsasFixRes, supsasResultsRes, supsasSportsRes,
            karnivalEdRes, karnivalBoothRes,
            klkResRes, klkSyncRes,
            takwimRes,
            pushRes, notifRes,
            akCgpaRes, akPencRes, akFilesRes,
            aiUsageRes, sysSetsRes,
        ] = await Promise.all([
            supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true }),
            supabaseAdmin.from('clubs').select('id', { count: 'exact', head: true }),
            supabaseAdmin.from('club_activities').select('id', { count: 'exact', head: true }),
            supabaseAdmin.from('club_reports').select('id', { count: 'exact', head: true }),
            supabaseAdmin.from('student_club_memberships').select('id', { count: 'exact', head: true }),
            supabaseAdmin.from('kebajikan_tickets').select('id', { count: 'exact', head: true }),
            supabaseAdmin.from('kebajikan_ticket_comments').select('id', { count: 'exact', head: true }),
            supabaseAdmin.from('polymart_orders').select('id', { count: 'exact', head: true }),
            supabaseAdmin.from('polymart_reviews').select('id', { count: 'exact', head: true }),
            supabaseAdmin.from('polymart_reports').select('id', { count: 'exact', head: true }),
            supabaseAdmin.from('polyrider_jobs').select('id', { count: 'exact', head: true }),
            supabaseAdmin.from('polyrider_bids').select('id', { count: 'exact', head: true }),
            supabaseAdmin.from('polyrider_sos_logs').select('id', { count: 'exact', head: true }),
            supabaseAdmin.from('keusahawanan_businesses').select('id', { count: 'exact', head: true }),
            supabaseAdmin.from('business_products').select('id', { count: 'exact', head: true }),
            supabaseAdmin.from('business_transactions').select('id', { count: 'exact', head: true }),
            supabaseAdmin.from('supsas_fixtures').select('id', { count: 'exact', head: true }),
            supabaseAdmin.from('supsas_results').select('id', { count: 'exact', head: true }),
            supabaseAdmin.from('supsas_sports').select('id', { count: 'exact', head: true }),
            supabaseAdmin.from('karnival_editions').select('id', { count: 'exact', head: true }),
            supabaseAdmin.from('karnival_booths').select('id', { count: 'exact', head: true }),
            supabaseAdmin.from('klk_student_residency').select('id', { count: 'exact', head: true }),
            supabaseAdmin.from('klk_sync_log').select('id', { count: 'exact', head: true }),
            supabaseAdmin.from('takwim_pusat').select('id', { count: 'exact', head: true }),
            supabaseAdmin.from('push_subscriptions').select('id', { count: 'exact', head: true }),
            supabaseAdmin.from('notifications').select('id', { count: 'exact', head: true }),
            supabaseAdmin.from('akademik_cgpa_records').select('id', { count: 'exact', head: true }),
            supabaseAdmin.from('akademik_pencapaian').select('id', { count: 'exact', head: true }),
            supabaseAdmin.from('akademik_files').select('id', { count: 'exact', head: true }),
            supabaseAdmin.from('ai_usage_logs').select('id', { count: 'exact', head: true }),
            supabaseAdmin.from('system_settings').select('key, value').in('key', ['ai_total_tokens', 'ai_token_limit']),
        ]);

        // Parse AI token usage
        let aiTokensUsed = 0, aiTokenLimit = 1000000;
        (sysSetsRes.data || []).forEach(s => {
            if (s.key === 'ai_total_tokens') aiTokensUsed = parseInt(s.value) || 0;
            if (s.key === 'ai_token_limit') aiTokenLimit = parseInt(s.value) || 1000000;
        });

        // ── Advanced Diagnostics Queries ──
        const [
            prDiagnosticsRes, pmDiagnosticsRes, kebDiagnosticsRes, accDiagnosticsRes,
            dbHealthRes
        ] = await Promise.all([
            // PolyRider
            supabaseAdmin.rpc('get_polyrider_telemetry').then(r => r, e => ({ data: null })),
            // PolyMart
            supabaseAdmin.rpc('get_polymart_telemetry').then(r => r, e => ({ data: null })),
            // Kebajikan
            supabaseAdmin.rpc('get_kebajikan_telemetry').then(r => r, e => ({ data: null })),
            // Accounts
            supabaseAdmin.rpc('get_account_telemetry').then(r => r, e => ({ data: null })),
            // Database Health Metrics (V3) — with proper error handling
            supabaseAdmin.rpc('get_database_health_metrics').then(r => {
                if (r.error) {
                    console.error('[telemetry] get_database_health_metrics RPC error:', r.error.message);
                    return { data: null };
                }
                return r;
            }, e => { console.error('[telemetry] get_database_health_metrics exception:', e.message); return { data: null }; })
        ]);

        // Note: the RPCs above might not exist yet, so we'll fallback to manual aggregation for PolyRider, PolyMart, Kebajikan, Accounts
        
        // PolyRider
        const { data: prJobs } = await supabaseAdmin.from('polyrider_jobs').select('status, created_at');
        let prStatus = {}, prStuckEmg = 0, prTotal = 0, prCancelled = 0;
        (prJobs || []).forEach(j => {
            prStatus[j.status] = (prStatus[j.status] || 0) + 1;
            prTotal++;
            if (j.status === 'CANCELLED') prCancelled++;
        });

        // Compute stuck emergencies accurately from active SOS logs
        const { data: prSos } = await supabaseAdmin.from('polyrider_sos_logs').select('created_at').or('resolved.eq.false,resolved.is.null');
        (prSos || []).forEach(s => {
            if ((Date.now() - new Date(s.created_at).getTime()) > 3600000) prStuckEmg++;
        });

        // PolyMart
        const { data: pmOrders } = await supabaseAdmin.from('polymart_orders').select('status, created_at');
        let pmStatus = {}, pmStalePend = 0, pmTotal = 0, pmCancelled = 0;
        (pmOrders || []).forEach(o => {
            pmStatus[o.status] = (pmStatus[o.status] || 0) + 1;
            pmTotal++;
            if (o.status === 'CANCELLED') pmCancelled++;
            if (o.status === 'PENDING' && (Date.now() - new Date(o.created_at).getTime()) > 48 * 3600000) pmStalePend++;
        });

        // Kebajikan
        const { data: kebTickets } = await supabaseAdmin.from('kebajikan_tickets').select('status, sla_deadline, assigned_to, priority, reopen_count');
        let kebStatus = {}, kebSlaBreach = 0, kebUnassigned = 0, kebHighOpen = 0, kebReopen = 0;
        (kebTickets || []).forEach(t => {
            kebStatus[t.status] = (kebStatus[t.status] || 0) + 1;
            if (t.status !== 'RESOLVED' && t.status !== 'CLOSED' && t.status !== 'CANCELLED') {
                if (t.sla_deadline && new Date(t.sla_deadline).getTime() < Date.now()) kebSlaBreach++;
                if (!t.assigned_to) kebUnassigned++;
                if (t.priority === 'HIGH' || t.priority === 'URGENT') kebHighOpen++;
            }
            if (t.reopen_count > 0) kebReopen++;
        });

        // Accounts
        const { data: accProfiles } = await supabaseAdmin.from('profiles').select('account_status, department');
        let accPending = 0, accRejected = 0, accNoDept = 0;
        (accProfiles || []).forEach(p => {
            if (p.account_status === 'PENDING') accPending++;
            if (p.account_status === 'REJECTED') accRejected++;
            if (!p.department) accNoDept++;
        });

        // Diagnostics Object Construction
        const diagnostics = {
            polyrider: {
                status_breakdown: prStatus,
                stuck_emergency: prStuckEmg,
                cancel_rate_pct: prTotal > 0 ? (prCancelled / prTotal) * 100 : 0,
                alerts: []
            },
            polymart: {
                status_breakdown: pmStatus,
                pending_stale: pmStalePend,
                cancel_rate_pct: pmTotal > 0 ? (pmCancelled / pmTotal) * 100 : 0,
                alerts: []
            },
            kebajikan: {
                status_breakdown: kebStatus,
                sla_breached: kebSlaBreach,
                unassigned: kebUnassigned,
                high_priority_open: kebHighOpen,
                reopen_count: kebReopen,
                alerts: []
            },
            ai: {
                tokens_used: aiTokensUsed,
                token_limit: aiTokenLimit,
                usage_pct: aiTokenLimit > 0 ? (aiTokensUsed / aiTokenLimit) * 100 : 0,
                alerts: []
            },
            push: {
                total_subs: pushRes.count || 0,
                total_profiles: profilesRes.count || 1,
                adoption_rate_pct: profilesRes.count ? ((pushRes.count || 0) / profilesRes.count) * 100 : 0,
                alerts: []
            },
            accounts: {
                total: profilesRes.count || 0,
                pending: accPending,
                rejected: accRejected,
                no_department: accNoDept,
                alerts: []
            },
            database: {
                max_connections: dbHealthRes?.data?.max_connections || 100,
                active_connections: dbHealthRes?.data?.active_connections || 0,
                idle_connections: dbHealthRes?.data?.idle_connections || 0,
                txid_age: dbHealthRes?.data?.txid_age || 0,
                db_size_mb: dbHealthRes?.data?.db_size_mb || 0,
                cache_hit_rate_pct: dbHealthRes?.data?.cache_hit_rate_pct || 99.0,
                dead_tuples_pct: dbHealthRes?.data?.dead_tuples_pct || 0,
                waiting_locks: dbHealthRes?.data?.waiting_locks || 0,
                long_running_queries: dbHealthRes?.data?.long_running_queries || 0,
                // WAL / Realtime monitoring
                wal_retained_mb: dbHealthRes?.data?.wal_retained_mb || 0,
                replication_slot_name: dbHealthRes?.data?.replication_slot_name || 'none',
                replication_slot_active: dbHealthRes?.data?.replication_slot_active || false,
                realtime_tables: dbHealthRes?.data?.realtime_tables || 0,
                realtime_list_changes_calls: dbHealthRes?.data?.realtime_list_changes_calls || 0,
                realtime_list_changes_total_ms: dbHealthRes?.data?.realtime_list_changes_total_ms || 0,
                db_uptime_seconds: dbHealthRes?.data?.db_uptime_seconds || 0,
                alerts: []
            }
        };

        // Populate Alerts
        if (diagnostics.polyrider.stuck_emergency > 0) diagnostics.polyrider.alerts.push(`${diagnostics.polyrider.stuck_emergency} trip EMERGENCY tanpa respons rider!`);
        if (diagnostics.polyrider.cancel_rate_pct > 60) diagnostics.polyrider.alerts.push(`Kadar pembatalan trip sangat tinggi (${diagnostics.polyrider.cancel_rate_pct.toFixed(1)}%)`);
        
        if (diagnostics.polymart.pending_stale > 0) diagnostics.polymart.alerts.push(`${diagnostics.polymart.pending_stale} pesanan PENDING > 48 jam`);
        if (diagnostics.polymart.cancel_rate_pct > 60) diagnostics.polymart.alerts.push(`Kadar pembatalan pesanan sangat tinggi (${diagnostics.polymart.cancel_rate_pct.toFixed(1)}%)`);
        
        if (diagnostics.kebajikan.sla_breached > 0) diagnostics.kebajikan.alerts.push(`${diagnostics.kebajikan.sla_breached} tiket e-Kebajikan melepasi tarikh akhir SLA!`);
        if (diagnostics.kebajikan.unassigned > 3) diagnostics.kebajikan.alerts.push(`${diagnostics.kebajikan.unassigned} tiket baharu belum ditugaskan kepada staf`);
        
        if (diagnostics.ai.usage_pct > 90) diagnostics.ai.alerts.push(`Penggunaan token AI telah mencapai ${diagnostics.ai.usage_pct.toFixed(1)}% dari had!`);
        
        if (diagnostics.database.active_connections > (diagnostics.database.max_connections * 0.85)) {
            diagnostics.database.alerts.push(`AMARAN KRITIKAL: Penggunaan sambungan pangkalan data kritikal (${diagnostics.database.active_connections}/${diagnostics.database.max_connections} aktif)`);
        }
        if (diagnostics.database.txid_age > 1500000000) {
            diagnostics.database.alerts.push(`AMARAN KRITIKAL: Risiko Transaction ID Wraparound! Umur TXID mencapai ${diagnostics.database.txid_age}. Jalankan VACUUM FREEZE segera.`);
        }
        if (diagnostics.database.waiting_locks > 5) {
            diagnostics.database.alerts.push(`Terdapat ${diagnostics.database.waiting_locks} transaksi tersangkut menunggu Lock (Lock Contention).`);
        }
        if (diagnostics.database.long_running_queries > 3) {
            diagnostics.database.alerts.push(`${diagnostics.database.long_running_queries} query sedang berjalan melebihi 5 minit (Bottleneck risiko tinggi).`);
        }
        if (diagnostics.database.cache_hit_rate_pct < 85) diagnostics.database.alerts.push(`Kadar hit cache PostgreSQL sangat rendah (${diagnostics.database.cache_hit_rate_pct}%)`);
        if (diagnostics.database.dead_tuples_pct > 20) diagnostics.database.alerts.push(`Kadar dead tuples (bloat) tinggi (${diagnostics.database.dead_tuples_pct}%) - Perlu VACUUM.`);
        // WAL / Realtime alerts — CRASH PREVENTION (Had: 2GB / max_slot_wal_keep_size = 2048MB)
        if (diagnostics.database.wal_retained_mb > 1024) {
            diagnostics.database.alerts.push(`🚨 KRITIKAL: WAL Retained sudah ${diagnostics.database.wal_retained_mb} MB! Had sistem: 2GB. Restart Realtime service SEGERA.`);
        } else if (diagnostics.database.wal_retained_mb > 512) {
            diagnostics.database.alerts.push(`⚠️ AMARAN: WAL Retained sudah ${diagnostics.database.wal_retained_mb} MB. Pantau dengan rapat — had sistem: 2GB.`);
        }
        if (diagnostics.database.realtime_tables > 10) {
            diagnostics.database.alerts.push(`⚠️ Terlalu banyak jadual Realtime (${diagnostics.database.realtime_tables}). Setiap jadual tambahan meningkatkan beban WAL. Pertimbangkan untuk kurangkan.`);
        }

        // ── Historical snapshots (last 30 days) ──
        const { data: snapshots } = await supabaseAdmin
            .from('system_telemetry_snapshots')
            .select('*')
            .gte('snapshot_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
            .order('snapshot_date', { ascending: true });

        return res.status(200).json({
            server: {
                uptime_seconds: Math.floor(uptimeSeconds),
                memory: {
                    rss_mb: +(memUsage.rss / 1024 / 1024).toFixed(2),
                    heap_used_mb: +(memUsage.heapUsed / 1024 / 1024).toFixed(2),
                    heap_total_mb: +(memUsage.heapTotal / 1024 / 1024).toFixed(2),
                    external_mb: +(memUsage.external / 1024 / 1024).toFixed(2),
                },
                cpu: { user_us: cpuUsage.user, system_us: cpuUsage.system },
                node_version: process.version,
                platform: process.platform,
                pid: process.pid,
            },
            modules: {
                profiles:              profilesRes.count ?? 0,
                clubs:                 clubsRes.count ?? 0,
                club_activities:       clubActRes.count ?? 0,
                club_reports:          clubRepRes.count ?? 0,
                club_memberships:      clubMemRes.count ?? 0,
                kebajikan_tickets:     kebajikanRes.count ?? 0,
                kebajikan_comments:    kebajikanCommentsRes.count ?? 0,
                kebajikan_breakdown:   { open: kebStatus.OPEN || 0, escalated: kebStatus.ESCALATED || 0, resolved: kebStatus.RESOLVED || 0 },
                polymart_orders:       polymartOrdersRes.count ?? 0,
                polymart_reviews:      polymartReviewsRes.count ?? 0,
                polymart_reports:      polymartReportsRes.count ?? 0,
                polyrider_jobs:        prJobsRes.count ?? 0,
                polyrider_bids:        prBidsRes.count ?? 0,
                polyrider_sos:         prSosRes.count ?? 0,
                businesses:            bizRes.count ?? 0,
                business_products:     bizProdRes.count ?? 0,
                business_transactions: bizTxRes.count ?? 0,
                supsas_fixtures:       supsasFixRes.count ?? 0,
                supsas_results:        supsasResultsRes.count ?? 0,
                supsas_sports:         supsasSportsRes.count ?? 0,
                karnival_editions:     karnivalEdRes.count ?? 0,
                karnival_booths:       karnivalBoothRes.count ?? 0,
                klk_residency:         klkResRes.count ?? 0,
                klk_sync_logs:         klkSyncRes.count ?? 0,
                takwim_events:         takwimRes.count ?? 0,
                push_subscriptions:    pushRes.count ?? 0,
                notifications:         notifRes.count ?? 0,
                akademik_cgpa:         akCgpaRes.count ?? 0,
                akademik_pencapaian:   akPencRes.count ?? 0,
                akademik_files:        akFilesRes.count ?? 0,
                ai_usage_logs:         aiUsageRes.count ?? 0,
                ai_tokens_used:        aiTokensUsed,
                ai_token_limit:        aiTokenLimit,
            },
            diagnostics,
            snapshots: snapshots || [],
            timestamp: new Date().toISOString(),
        });
    } catch (err) {
        console.error('[system-telemetry] Error:', err.message);
        return res.status(500).json({ error: err.message });
    }
});

// ── Daily Telemetry Snapshot Cron (03:00 AM) ──────────────────────────────────
// Saves a snapshot of all module metrics for historical trend analysis.
cron.schedule('0 3 * * *', async () => {
    console.log('[CRON] Starting daily telemetry snapshot...');
    try {
        if (!supabaseAdmin) { console.warn('[CRON] Supabase Admin not available, skipping.'); return; }

        const memUsage = process.memoryUsage();
        const [
            p, c, ca, cr, cm, kt, po, pj, ps,
            b, bp, bt, sf, kb, klk, tw, push, notif, acgpa, apenc
        ] = await Promise.all([
            supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true }),
            supabaseAdmin.from('clubs').select('id', { count: 'exact', head: true }),
            supabaseAdmin.from('club_activities').select('id', { count: 'exact', head: true }),
            supabaseAdmin.from('club_reports').select('id', { count: 'exact', head: true }),
            supabaseAdmin.from('student_club_memberships').select('id', { count: 'exact', head: true }),
            supabaseAdmin.from('kebajikan_tickets').select('id', { count: 'exact', head: true }),
            supabaseAdmin.from('polymart_orders').select('id', { count: 'exact', head: true }),
            supabaseAdmin.from('polyrider_jobs').select('id', { count: 'exact', head: true }),
            supabaseAdmin.from('polyrider_sos_logs').select('id', { count: 'exact', head: true }),
            supabaseAdmin.from('keusahawanan_businesses').select('id', { count: 'exact', head: true }),
            supabaseAdmin.from('business_products').select('id', { count: 'exact', head: true }),
            supabaseAdmin.from('business_transactions').select('id', { count: 'exact', head: true }),
            supabaseAdmin.from('supsas_fixtures').select('id', { count: 'exact', head: true }),
            supabaseAdmin.from('karnival_booths').select('id', { count: 'exact', head: true }),
            supabaseAdmin.from('klk_student_residency').select('id', { count: 'exact', head: true }),
            supabaseAdmin.from('takwim_pusat').select('id', { count: 'exact', head: true }),
            supabaseAdmin.from('push_subscriptions').select('id', { count: 'exact', head: true }),
            supabaseAdmin.from('notifications').select('id', { count: 'exact', head: true }),
            supabaseAdmin.from('akademik_cgpa_records').select('id', { count: 'exact', head: true }),
            supabaseAdmin.from('akademik_pencapaian').select('id', { count: 'exact', head: true }),
        ]);

        const { error } = await supabaseAdmin.from('system_telemetry_snapshots').upsert({
            snapshot_date: new Date().toISOString().split('T')[0],
            server_uptime_seconds: Math.floor(process.uptime()),
            server_rss_mb: +(memUsage.rss / 1024 / 1024).toFixed(2),
            server_heap_used_mb: +(memUsage.heapUsed / 1024 / 1024).toFixed(2),
            server_heap_total_mb: +(memUsage.heapTotal / 1024 / 1024).toFixed(2),
            m_profiles: p.count ?? 0,
            m_clubs: c.count ?? 0,
            m_club_activities: ca.count ?? 0,
            m_club_reports: cr.count ?? 0,
            m_club_memberships: cm.count ?? 0,
            m_kebajikan_tickets: kt.count ?? 0,
            m_polymart_orders: po.count ?? 0,
            m_polyrider_jobs: pj.count ?? 0,
            m_polyrider_sos: ps.count ?? 0,
            m_businesses: b.count ?? 0,
            m_business_products: bp.count ?? 0,
            m_business_transactions: bt.count ?? 0,
            m_supsas_fixtures: sf.count ?? 0,
            m_karnival_booths: kb.count ?? 0,
            m_klk_residency: klk.count ?? 0,
            m_takwim_events: tw.count ?? 0,
            m_push_subscriptions: push.count ?? 0,
            m_notifications: notif.count ?? 0,
            m_akademik_cgpa: acgpa.count ?? 0,
            m_akademik_pencapaian: apenc.count ?? 0,
        }, { onConflict: 'snapshot_date' });

        if (error) console.error('[CRON] Telemetry snapshot error:', error.message);
        else console.log('[CRON] Telemetry snapshot saved successfully.');
    } catch (err) {
        console.error('[CRON] Telemetry snapshot failed:', err.message);
    }
});

// ── Infrastructure Watchdog Cron (Every 5 Minutes) ────────────────────────────
// Auto-detects crash precursors (WAL bloat, OOM risk) and sends emergency email.
// Provides 2–4 hour warning window before potential OOM crash.
const _watchdogLastAlerts = {}; // Cooldown tracker: { alertKey: lastSentTimestamp }
const WATCHDOG_ALERT_EMAIL = 'aceneko14@gmail.com';
const WATCHDOG_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour cooldown per alert type

cron.schedule('*/5 * * * *', async () => {
    try {
        if (!supabaseAdmin) return;

        const { data: health, error: rpcErr } = await supabaseAdmin.rpc('get_database_health_metrics');
        if (rpcErr || !health) {
            console.warn('[WATCHDOG] RPC failed:', rpcErr?.message || 'null data');
            return;
        }

        const alerts = [];
        const nodeMemMb = +(process.memoryUsage().rss / 1024 / 1024).toFixed(2);

        // ── Check 1: WAL Retained (KRITIKAL — direct OOM crash precursor)
        // Server: 16GB RAM, max_slot_wal_keep_size = 2048MB
        // Alert early so admin has time to react before slot gets invalidated at 2GB
        if (health.wal_retained_mb > 1024) {
            alerts.push({
                key: 'wal_critical',
                severity: 'KRITIKAL',
                color: '#EF4444',
                emoji: '🚨',
                title: 'WAL Retained Kritikal',
                detail: `WAL retained: ${health.wal_retained_mb} MB — melebihi 1GB! Had sistem: 2GB. Jika mencapai 2GB, replication slot akan di-invalidate.`,
                action: 'Restart Realtime container atau kurangkan jadual Realtime SEGERA.',
            });
        } else if (health.wal_retained_mb > 512) {
            alerts.push({
                key: 'wal_warning',
                severity: 'AMARAN',
                color: '#F59E0B',
                emoji: '⚠️',
                title: 'WAL Retained Tinggi',
                detail: `WAL retained: ${health.wal_retained_mb} MB — mendekati had amaran. Had sistem: 2GB.`,
                action: 'Pantau dengan rapat. Pertimbangkan restart Realtime service jika terus meningkat.',
            });
        }

        // ── Check 2: Node.js RSS Memory (application-level OOM)
        if (nodeMemMb > 900) {
            alerts.push({
                key: 'node_mem_critical',
                severity: 'KRITIKAL',
                color: '#EF4444',
                emoji: '🧠',
                title: 'Node.js Memori Kritikal',
                detail: `Node.js RSS: ${nodeMemMb} MB — mendekati had OOM.`,
                action: 'Restart server Node.js segera. Semak memory leak.',
            });
        } else if (nodeMemMb > 500) {
            alerts.push({
                key: 'node_mem_warning',
                severity: 'AMARAN',
                color: '#F59E0B',
                emoji: '🧠',
                title: 'Node.js Memori Tinggi',
                detail: `Node.js RSS: ${nodeMemMb} MB — penggunaan memori luar biasa tinggi.`,
                action: 'Pantau trend. Pertimbangkan restart jika terus meningkat.',
            });
        }

        // ── Check 3: Database Connections Exhaustion
        const connPct = health.max_connections > 0 ? (health.active_connections / health.max_connections) * 100 : 0;
        if (connPct > 85) {
            alerts.push({
                key: 'conn_critical',
                severity: 'KRITIKAL',
                color: '#EF4444',
                emoji: '🔌',
                title: 'Sambungan DB Hampir Penuh',
                detail: `${health.active_connections}/${health.max_connections} sambungan aktif (${connPct.toFixed(1)}%).`,
                action: 'Semak connection leak. Restart aplikasi jika perlu.',
            });
        }

        // ── Check 4: Dead Tuples Bloat
        if (health.dead_tuples_pct > 40) {
            alerts.push({
                key: 'dead_tuples',
                severity: 'AMARAN',
                color: '#F59E0B',
                emoji: '🗑️',
                title: 'Dead Tuples Sangat Tinggi',
                detail: `Dead tuples: ${health.dead_tuples_pct}% — query performance terjejas.`,
                action: 'Jalankan VACUUM ANALYZE dari SQL Editor.',
            });
        }

        // ── Check 5: Replication Slot Inactive (Realtime down)
        if (health.replication_slot_name !== 'none' && !health.replication_slot_active) {
            alerts.push({
                key: 'repl_slot_dead',
                severity: 'KRITIKAL',
                color: '#EF4444',
                emoji: '💀',
                title: 'Replication Slot Tidak Aktif',
                detail: `Slot "${health.replication_slot_name}" tidak aktif — Realtime service mungkin mati. WAL akan terus terkumpul tanpa consumer.`,
                action: 'Restart Supabase Realtime container SEGERA. Ini boleh menyebabkan crash.',
            });
        }

        if (alerts.length === 0) return; // All clear

        // ── Cooldown: Skip alerts sent within the last hour
        const now = Date.now();
        const newAlerts = alerts.filter(a => {
            const lastSent = _watchdogLastAlerts[a.key] || 0;
            return (now - lastSent) > WATCHDOG_COOLDOWN_MS;
        });
        if (newAlerts.length === 0) return;

        // ── Build email
        const RESEND_API_KEY = process.env.RESEND_API_KEY;
        if (!RESEND_API_KEY) { console.warn('[WATCHDOG] RESEND_API_KEY not configured, skipping email.'); return; }

        const alertRows = newAlerts.map(a => `
            <tr>
                <td style="padding:16px 20px;border-bottom:1px solid #1e293b;">
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
                        <span style="font-size:20px;">${a.emoji}</span>
                        <span style="background:${a.color}20;color:${a.color};padding:3px 10px;border-radius:20px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1px;">${a.severity}</span>
                    </div>
                    <h3 style="color:#f8fafc;font-size:16px;font-weight:800;margin:0 0 6px 0;">${a.title}</h3>
                    <p style="color:#94a3b8;font-size:13px;line-height:1.6;margin:0 0 8px 0;">${a.detail}</p>
                    <p style="color:${a.color};font-size:12px;font-weight:700;margin:0;">→ ${a.action}</p>
                </td>
            </tr>`).join('');

        const uptimeStr = `${Math.floor((health.db_uptime_seconds || 0) / 3600)}j ${Math.floor(((health.db_uptime_seconds || 0) % 3600) / 60)}m`;

        const emailHtml = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background-color:#0f172a;">
    <div style="background-color:#0f172a;padding:40px 20px;">
        <table align="center" style="max-width:580px;margin:0 auto;width:100%;border-collapse:collapse;">
            <tr>
                <td style="padding:32px 24px;text-align:center;border-bottom:2px solid ${newAlerts[0].color}40;">
                    <div style="display:inline-block;width:48px;height:48px;background:${newAlerts[0].color}20;border-radius:16px;line-height:48px;font-size:24px;margin-bottom:16px;">${newAlerts[0].emoji}</div>
                    <h1 style="color:#f8fafc;font-size:22px;font-weight:900;margin:0 0 4px 0;">JPP POLISAS — Server Alert</h1>
                    <p style="color:${newAlerts[0].color};font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:3px;margin:0;">Watchdog Automatik · ${new Date().toLocaleString('ms-MY', { timeZone: 'Asia/Kuala_Lumpur' })}</p>
                </td>
            </tr>
            ${alertRows}
            <tr>
                <td style="padding:20px;background:#1e293b40;border-radius:0 0 16px 16px;">
                    <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                        <tr>
                            <td style="color:#64748b;font-size:11px;padding:4px 0;">WAL Retained</td>
                            <td style="color:#e2e8f0;font-size:11px;font-weight:700;text-align:right;padding:4px 0;">${health.wal_retained_mb} MB</td>
                        </tr>
                        <tr>
                            <td style="color:#64748b;font-size:11px;padding:4px 0;">Node.js RSS</td>
                            <td style="color:#e2e8f0;font-size:11px;font-weight:700;text-align:right;padding:4px 0;">${nodeMemMb} MB</td>
                        </tr>
                        <tr>
                            <td style="color:#64748b;font-size:11px;padding:4px 0;">DB Connections</td>
                            <td style="color:#e2e8f0;font-size:11px;font-weight:700;text-align:right;padding:4px 0;">${health.active_connections}/${health.max_connections}</td>
                        </tr>
                        <tr>
                            <td style="color:#64748b;font-size:11px;padding:4px 0;">Realtime Tables</td>
                            <td style="color:#e2e8f0;font-size:11px;font-weight:700;text-align:right;padding:4px 0;">${health.realtime_tables}</td>
                        </tr>
                        <tr>
                            <td style="color:#64748b;font-size:11px;padding:4px 0;">DB Uptime</td>
                            <td style="color:#e2e8f0;font-size:11px;font-weight:700;text-align:right;padding:4px 0;">${uptimeStr}</td>
                        </tr>
                    </table>
                </td>
            </tr>
            <tr>
                <td style="padding:24px;text-align:center;">
                    <a href="https://jpp.cipher-node.org/jpp/telemetry" style="display:inline-block;background:${newAlerts[0].color};color:#fff;font-size:12px;font-weight:800;text-decoration:none;padding:14px 32px;border-radius:12px;text-transform:uppercase;letter-spacing:1.5px;">Buka Telemetry Dashboard</a>
                </td>
            </tr>
            <tr>
                <td style="padding:16px 24px;text-align:center;">
                    <p style="color:#475569;font-size:10px;margin:0;">Alert automatik oleh JPP POLISAS Infrastructure Watchdog.<br/>Cooldown: 1 jam antara setiap jenis alert.</p>
                </td>
            </tr>
        </table>
    </div>
</body>
</html>`;

        const highestSeverity = newAlerts.some(a => a.severity === 'KRITIKAL') ? '🚨 KRITIKAL' : '⚠️ AMARAN';
        const subjectAlerts = newAlerts.map(a => a.title).join(', ');

        const resendRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                from: 'JPP Watchdog <jpp@cipher-node.org>',
                to: WATCHDOG_ALERT_EMAIL,
                subject: `${highestSeverity} JPP Server — ${subjectAlerts}`,
                html: emailHtml,
            }),
        });

        if (resendRes.ok) {
            newAlerts.forEach(a => { _watchdogLastAlerts[a.key] = now; });
            console.log(`[WATCHDOG] ✅ Alert email sent: ${subjectAlerts}`);
        } else {
            const errBody = await resendRes.json().catch(() => ({}));
            console.error('[WATCHDOG] ❌ Email send failed:', errBody);
        }
    } catch (err) {
        console.error('[WATCHDOG] Cron error:', err.message);
    }
});

// ==========================================
// Serve Static Frontend (Vite Build)
// ==========================================
// After building the Vite app, it outputs to 'dist'. We serve it here.
// OPTIMASI: Cache-Control untuk aset statik — browser tak perlu minta semula
app.use(express.static(path.join(__dirname, 'dist'), {
    maxAge: '1d',         // CSS/JS/images cache 1 hari
    etag: true,           // Enable ETag untuk conditional requests
    lastModified: true,
    setHeaders: (res, filePath) => {
        // Hashed assets (Vite adds hash) — cache lama
        if (filePath.match(/\.(js|css)$/) && filePath.includes('assets')) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
        // index.html — jangan cache (supaya deploy baru terus nampak)
        if (filePath.endsWith('index.html')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        }
    },
}));

// OPTIMASI: Cache index.html dalam memori — elak disk I/O pada setiap request
// Ini menyelesaikan isu 3% Express failure semasa peak 200 VU
const INDEX_HTML_PATH = path.join(__dirname, 'dist', 'index.html');
let cachedIndexHtml = null;
try {
    cachedIndexHtml = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
    console.log('[STARTUP] ✅ index.html cached in memory (' + Buffer.byteLength(cachedIndexHtml) + ' bytes)');
} catch (err) {
    console.warn('[STARTUP] ⚠️ index.html not found in dist/ — SPA fallback will use sendFile (slower)');
}

// SPA Fallback: Any route not matched by API or static files will return index.html
app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api/')) {
        if (cachedIndexHtml) {
            // Serve dari memory — ZERO disk I/O, boleh handle ribuan req/s
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.status(200).send(cachedIndexHtml);
        } else {
            res.sendFile(INDEX_HTML_PATH);
        }
    } else {
        next();
    }
});

// ==========================================
// GRACEFUL SHUTDOWN & CRASH PROTECTION
// ==========================================
// Elakkan server mati senyap tanpa log — ini punca "crash" sebelum ini
process.on('uncaughtException', (err) => {
    console.error('\n🚨 [FATAL] Uncaught Exception:', err.message);
    console.error(err.stack);
    // Beri masa untuk log ditulis sebelum exit
    setTimeout(() => process.exit(1), 1000);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('\n⚠️ [WARNING] Unhandled Promise Rejection:', reason);
    // Jangan exit — biarkan server terus berjalan untuk rejection yang tidak kritikal
});

// Graceful shutdown — tutup connections dengan elok bila Ctrl+C atau restart
const gracefulShutdown = (signal) => {
    console.log(`\n🛑 [SHUTDOWN] Received ${signal}. Shutting down gracefully...`);
    server.close(() => {
        console.log('[SHUTDOWN] ✅ Server closed. Goodbye.');
        process.exit(0);
    });
    // Paksa tutup selepas 10s jika ada connections yang degil
    setTimeout(() => {
        console.error('[SHUTDOWN] ❌ Forced exit after 10s timeout.');
        process.exit(1);
    }, 10000);
};

const server = app.listen(port, () => {
    console.log(`[JPP-POLISAS] Server is running on port ${port}`);
    console.log(`[JPP-POLISAS] Static cache: ${cachedIndexHtml ? 'ENABLED (in-memory)' : 'DISABLED (disk fallback)'}`);
});

// Tingkatkan connection limits untuk handle spike traffic orientasi
server.keepAliveTimeout = 65000;   // Lebih tinggi dari default 5s
server.headersTimeout = 66000;     // Mesti > keepAliveTimeout
// maxConnections: biarkan default Node.js (unlimited)

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
