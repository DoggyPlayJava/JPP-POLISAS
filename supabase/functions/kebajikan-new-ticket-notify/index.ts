import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase    = createClient(supabaseUrl, serviceKey);

interface NewTicketPayload {
  type:    "INSERT";
  table:   "kebajikan_tickets";
  schema:  "public";
  record:  {
    id:          string;
    ticket_no:   string;
    title:       string;
    category:    string;
    full_name:   string;
    submitter_id: string | null;
    created_at:  string;
  };
}

Deno.serve(async (req: Request) => {
  try {
    const payload: NewTicketPayload = await req.json();

    if (payload.type !== "INSERT") {
      return new Response("Not an INSERT event.", { status: 200 });
    }

    const { id, ticket_no, title, category, full_name } = payload.record;

    if (!id || !ticket_no) {
      return new Response("Missing ticket data.", { status: 400 });
    }

    // Broadcast in-app notification to all EXCO_KEBAJIKAN
    const { error: notifErr } = await supabase.from("kebajikan_notifications").insert({
      ticket_id:     id,
      target_user_id: null,         // null = broadcast
      target_role:    "EXCO_KEBAJIKAN",
      title:          `🆕 Aduan Baru: ${ticket_no}`,
      body:           `"${title}" dikemukakan oleh ${full_name}. Kategori: ${category}. Sila semak dan ambil tindakan.`,
      type:           "NEW_TICKET",
    });

    if (notifErr) {
      console.error("[kebajikan-new-ticket-notify] Notification insert error:", notifErr.message);
    }

    // === PHASE 2 (Email) ===
    // Uncomment below when Resend API key is configured in Supabase secrets.
    //
    // const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    // if (RESEND_API_KEY) {
    //   // Fetch all Exco Kebajikan emails
    //   const { data: excoUsers } = await supabase
    //     .from("profiles")
    //     .select("email, full_name")
    //     .eq("role", "JPP")
    //     .eq("jpp_unit", "KEBAJIKAN");
    //
    //   for (const exco of excoUsers ?? []) {
    //     await fetch("https://api.resend.com/emails", {
    //       method: "POST",
    //       headers: {
    //         "Authorization": `Bearer ${RESEND_API_KEY}`,
    //         "Content-Type": "application/json",
    //       },
    //       body: JSON.stringify({
    //         from: "E-Kebajikan <kebajikan@polisas.edu.my>",
    //         to:   exco.email,
    //         subject: `[E-Kebajikan] Aduan Baru: ${ticket_no}`,
    //         html: `<p>Salam, ${exco.full_name}.<br/>Aduan baru <strong>${ticket_no}</strong> telah diterima.<br/><strong>${title}</strong><br/>Sila log masuk ke sistem untuk mengambil tindakan.</p>`,
    //       }),
    //     });
    //   }
    // }

    return new Response(JSON.stringify({ success: true, ticket_no, notif_created: !notifErr }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("[kebajikan-new-ticket-notify] Error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
