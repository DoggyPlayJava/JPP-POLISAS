import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl  = Deno.env.get("SUPABASE_URL")!;
const serviceKey   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase     = createClient(supabaseUrl, serviceKey);

// These values are read from portal_settings.key = 'kebajikan_settings'
const DEFAULT_WARNING_HOURS  = 48;
const DEFAULT_ESCALATE_HOURS = 72;

Deno.serve(async (_req: Request) => {
  try {
    // 1. Read SLA config from kebajikan_settings
    const { data: settingsRow } = await supabase
      .from("kebajikan_settings")
      .select("*")
      .limit(1)
      .single();

    const warningHours  = Number(settingsRow?.sla_warning_hours ?? DEFAULT_WARNING_HOURS);
    const escalateHours = Number(settingsRow?.sla_escalate_hours ?? DEFAULT_ESCALATE_HOURS);
    const emailWarning = settingsRow?.email_warning ?? false;
    const emailEscalation = settingsRow?.email_escalation ?? false;

    let excosEmails: string[] = [];
    if (emailWarning || emailEscalation) {
      const { data: excos } = await supabase
        .from("profiles")
        .select("email")
        .eq("role", "EXCO_KEBAJIKAN");
      excosEmails = (excos?.map((e: any) => e.email).filter(Boolean) as string[]) || [];
    }

    const now = new Date();
    const warningCutoff  = new Date(now.getTime() - warningHours  * 3600000).toISOString();
    const escalateCutoff = new Date(now.getTime() - escalateHours * 3600000).toISOString();

    // 2. Fetch all active (non-terminal) tickets
    const { data: tickets, error: ticketErr } = await supabase
      .from("kebajikan_tickets")
      .select("id, ticket_no, title, status, updated_at, warning_sent_at, escalated_at, assigned_to, category")
      .not("status", "in", "(RESOLVED,CLOSED,CANCELLED)");

    if (ticketErr) throw ticketErr;
    if (!tickets || tickets.length === 0) {
      return new Response(JSON.stringify({ message: "No active tickets." }), { status: 200 });
    }

    const results = { warned: 0, escalated: 0, skipped: 0 };

    for (const ticket of tickets) {
      const lastUpdateAt = ticket.updated_at;

      // --- ESCALATE CHECK ---
      if (
        ticket.status !== "ESCALATED" &&
        !ticket.escalated_at &&
        lastUpdateAt < escalateCutoff
      ) {
        // Escalate: update status + record escalated_at
        await supabase
          .from("kebajikan_tickets")
          .update({
            status:       "ESCALATED",
            escalated_at: now.toISOString(),
          })
          .eq("id", ticket.id);

        // Insert status log
        await supabase.from("kebajikan_ticket_status_log").insert({
          ticket_id:  ticket.id,
          actor_role: "SISTEM",
          actor_name: "Sistem Auto-Escalation",
          old_status: ticket.status,
          new_status: "ESCALATED",
          note:       `Auto-escalated selepas ${escalateHours} jam tanpa kemaskini.`,
        });

        // Insert notification — broadcast ke EXCO
        await supabase.from("kebajikan_notifications").insert({
          ticket_id:     ticket.id,
          target_role:   "EXCO_KEBAJIKAN",
          title:         `🔴 Auto-Escalation: ${ticket.ticket_no}`,
          body:          `Tiket "${ticket.title}" telah diescalate secara automatik selepas ${escalateHours} jam tanpa tindakan.`,
          type:          "ESCALATION",
        });

        if (emailEscalation && excosEmails.length > 0) {
          const html = `
          <div style="font-family: sans-serif; padding: 20px;">
            <h2>🔴 Auto-Escalation (${escalateHours} Jam)</h2>
            <p>Sistem telah auto-escalate tiket ini kerana tiada tindakan selama lebih ${escalateHours} jam.</p>
            <p><strong>No. Tiket:</strong> ${ticket.ticket_no}</p>
            <p><strong>Tajuk:</strong> ${ticket.title}</p>
          </div>`;
          await supabase.functions.invoke("send-email", {
            body: { to: excosEmails, subject: `🔴 Auto-Escalation: ${ticket.ticket_no}`, html }
          });
        }

        results.escalated++;
        continue;
      }

      // --- WARNING CHECK ---
      if (
        !ticket.warning_sent_at &&
        lastUpdateAt < warningCutoff &&
        lastUpdateAt >= escalateCutoff
      ) {
        // Only warn if not already warned
        await supabase
          .from("kebajikan_tickets")
          .update({ warning_sent_at: now.toISOString() })
          .eq("id", ticket.id);

        // Insert notification
        await supabase.from("kebajikan_notifications").insert({
          ticket_id:     ticket.id,
          target_role:   "EXCO_KEBAJIKAN",
          title:         `⚠️ SLA Warning: ${ticket.ticket_no}`,
          body:          `Tiket "${ticket.title}" belum diproses lebih dari ${warningHours} jam. Sila ambil tindakan segera.`,
          type:          "WARNING",
        });

        if (emailWarning && excosEmails.length > 0) {
          const html = `
          <div style="font-family: sans-serif; padding: 20px;">
            <h2>⚠️ Amaran SLA (${warningHours} Jam)</h2>
            <p>Tiket ini belum menerima sebarang kemaskini melebihi ${warningHours} jam. Sila ambil tindakan segera.</p>
            <p><strong>No. Tiket:</strong> ${ticket.ticket_no}</p>
            <p><strong>Tajuk:</strong> ${ticket.title}</p>
          </div>`;
          await supabase.functions.invoke("send-email", {
            body: { to: excosEmails, subject: `⚠️ Amaran SLA: ${ticket.ticket_no}`, html }
          });
        }

        results.warned++;
        continue;
      }

      results.skipped++;
    }

    return new Response(JSON.stringify({
      success: true,
      processed: tickets.length,
      ...results,
      sla: { warningHours, escalateHours },
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("[check-kebajikan-sla] Error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
