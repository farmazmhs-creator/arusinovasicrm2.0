import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  statusLabel,
  formatMYR,
  formatDateTime,
  formatDate,
  turnaround,
} from "@/lib/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ---------- menu copy ----------
const MAIN_MENU =
  "👋 *Arus Inovasi*\nWhat do you need?\n\n" +
  "1️⃣  Quote Request\n" +
  "2️⃣  Purchase Order\n" +
  "3️⃣  Product Sourcing\n\n" +
  "_Reply with a number._";

const QUOTE_MENU =
  "*Quote Request*\n\n" +
  "1️⃣  New Quote Request\n" +
  "2️⃣  Quote Status\n\n" +
  "_Reply 1 or 2 — or 0 for the main menu._";

const PO_MENU =
  "*Purchase Order*\n\n" +
  "1️⃣  PO Follow Up\n" +
  "2️⃣  Delivery Status\n\n" +
  "_Reply 1 or 2 — or 0 for the main menu._";

const COMING_SOON =
  "🛠️ That option is coming soon.\n\nFor now, reply MENU to go back.";

// ---------- helpers ----------
function escapeXml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function twiml(message: string) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(
    message
  )}</Message></Response>`;
  return new Response(xml, {
    status: 200,
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}

function validSignature(
  url: string,
  params: Record<string, string>,
  signature: string,
  token: string
) {
  const data =
    url +
    Object.keys(params)
      .sort()
      .map((k) => k + params[k])
      .join("");
  const expected = crypto
    .createHmac("sha1", token)
    .update(Buffer.from(data, "utf-8"))
    .digest("base64");
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(signature)
    );
  } catch {
    return false;
  }
}

const normRef = (s: string) => s.toUpperCase().replace(/\s+/g, "");

// ---------- lookups ----------
async function quoteStatus(admin: any, raw: string) {
  const ref = normRef(raw);
  const { data } = await admin
    .from("quotations")
    .select(
      "quote_number, status, received_at, completed_at, customers(hospital_name), processed:user_profiles!quotations_processed_by_fkey(name)"
    )
    .ilike("quote_number", `%${ref}%`)
    .limit(1)
    .maybeSingle();

  if (!data)
    return `No quote found matching "${raw}". Check the number and resend, or reply MENU.`;

  return (
    `📋 *${data.quote_number}*\n` +
    `Customer: ${data.customers?.hospital_name ?? "—"}\n` +
    `Status: *${statusLabel(data.status)}*\n` +
    `Received: ${formatDateTime(data.received_at)}\n` +
    (data.completed_at
      ? `Completed: ${formatDateTime(data.completed_at)} (${turnaround(
          data.received_at,
          data.completed_at
        )})\n`
      : "") +
    `Handled by: ${data.processed?.name ?? "not assigned yet"}\n\n` +
    `_Reply MENU for the menu._`
  );
}

async function poFollowUp(admin: any, raw: string) {
  const ref = normRef(raw);
  const { data } = await admin
    .from("purchase_orders")
    .select(
      "po_number, status, total_amount, delivery_due, created_at, customers(hospital_name)"
    )
    .ilike("po_number", `%${ref}%`)
    .limit(1)
    .maybeSingle();

  if (!data)
    return `No PO found matching "${raw}". Check the number and resend, or reply MENU.`;

  return (
    `🧾 *${data.po_number}*\n` +
    `Customer: ${data.customers?.hospital_name ?? "—"}\n` +
    `Status: *${statusLabel(data.status)}*\n` +
    `Amount: ${formatMYR(data.total_amount)}\n` +
    `Delivery due: ${formatDate(data.delivery_due)}\n\n` +
    `_Reply MENU for the menu._`
  );
}

async function deliveryStatus(admin: any, raw: string) {
  const ref = normRef(raw);
  const { data } = await admin
    .from("purchase_orders")
    .select(
      "po_number, status, delivery_due, delivered_at, eta_date, eta_note, customers(hospital_name)"
    )
    .ilike("po_number", `%${ref}%`)
    .limit(1)
    .maybeSingle();

  if (!data)
    return `No PO found matching "${raw}". Check the number and resend, or reply MENU.`;

  let line: string;
  if (data.status === "delivered" && data.delivered_at)
    line = `✅ Delivered on ${formatDate(data.delivered_at)}`;
  else if (data.eta_date) line = `🚚 ETA ${formatDate(data.eta_date)}`;
  else if (data.delivery_due) line = `📅 Due ${formatDate(data.delivery_due)}`;
  else line = "No delivery date recorded yet";

  return (
    `🚚 *${data.po_number}*\n` +
    `Customer: ${data.customers?.hospital_name ?? "—"}\n` +
    `${line}\n` +
    `Status: *${statusLabel(data.status)}*\n` +
    (data.eta_note ? `Note: ${data.eta_note}\n` : "") +
    `\n_Reply MENU for the menu._`
  );
}

// ---------- webhook ----------
export async function GET() {
  return new Response("Arus Inovasi WhatsApp webhook is live.", {
    status: 200,
  });
}

export async function POST(request: Request) {
  const form = await request.formData();
  const params: Record<string, string> = {};
  form.forEach((v, k) => (params[k] = String(v)));

  const from = params["From"] || ""; // e.g. whatsapp:+60166712714
  const bodyRaw = (params["Body"] || "").trim();
  const phone = from.replace("whatsapp:", "").trim();

  // Optional signature check — enable in production by setting
  // TWILIO_WEBHOOK_VALIDATE=1. Left off by default so first-time setup is smooth.
  if (process.env.TWILIO_WEBHOOK_VALIDATE === "1") {
    const token = process.env.TWILIO_AUTH_TOKEN || "";
    const sig = request.headers.get("x-twilio-signature") || "";
    const host =
      request.headers.get("x-forwarded-host") ||
      request.headers.get("host") ||
      "";
    const url =
      process.env.TWILIO_WEBHOOK_URL ||
      `https://${host}/api/whatsapp/webhook`;
    if (!validSignature(url, params, sig, token)) {
      return new Response("Invalid signature", { status: 403 });
    }
  }

  if (!phone) return twiml("Sorry, I couldn't read that. Reply MENU to start.");

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return twiml(
      "The system isn't fully configured yet. Please try again shortly."
    );
  }

  // log inbound (best-effort)
  admin
    .from("wa_messages")
    .insert({ phone, direction: "in", body: bodyRaw })
    .then(() => {}, () => {});

  // load session
  const { data: session } = await admin
    .from("wa_sessions")
    .select("state")
    .eq("phone", phone)
    .maybeSingle();

  const state = session?.state ?? "new";
  const lower = bodyRaw.toLowerCase();
  const isReset = ["menu", "hi", "hello", "hey", "start"].includes(lower);
  const isBack = lower === "0" || lower === "back";

  let reply = MAIN_MENU;
  let nextState = "menu";

  if (state === "new" || isReset) {
    reply = MAIN_MENU;
    nextState = "menu";
  } else if (state === "menu") {
    if (bodyRaw === "1") {
      reply = QUOTE_MENU;
      nextState = "quote";
    } else if (bodyRaw === "2") {
      reply = PO_MENU;
      nextState = "po";
    } else if (bodyRaw === "3") {
      reply = COMING_SOON; // Product Sourcing
      nextState = "menu";
    } else {
      reply = "Please reply 1, 2 or 3.\n\n" + MAIN_MENU;
      nextState = "menu";
    }
  } else if (state === "quote") {
    if (isBack) {
      reply = MAIN_MENU;
      nextState = "menu";
    } else if (bodyRaw === "1") {
      reply = COMING_SOON; // New Quote Request
      nextState = "menu";
    } else if (bodyRaw === "2") {
      reply = "Send me the *quote number* (e.g. QT-2026-0001).";
      nextState = "ask_quote_ref";
    } else {
      reply = "Please reply 1 or 2 — or 0 for the main menu.\n\n" + QUOTE_MENU;
      nextState = "quote";
    }
  } else if (state === "po") {
    if (isBack) {
      reply = MAIN_MENU;
      nextState = "menu";
    } else if (bodyRaw === "1") {
      reply = "Send me the *PO number* (e.g. PO-2026-0001).";
      nextState = "ask_po_ref";
    } else if (bodyRaw === "2") {
      reply = "Send me the *PO number* to check delivery.";
      nextState = "ask_delivery_ref";
    } else {
      reply = "Please reply 1 or 2 — or 0 for the main menu.\n\n" + PO_MENU;
      nextState = "po";
    }
  } else if (state === "ask_quote_ref") {
    if (isBack) {
      reply = MAIN_MENU;
      nextState = "menu";
    } else {
      reply = await quoteStatus(admin, bodyRaw);
      nextState = "menu";
    }
  } else if (state === "ask_po_ref") {
    if (isBack) {
      reply = MAIN_MENU;
      nextState = "menu";
    } else {
      reply = await poFollowUp(admin, bodyRaw);
      nextState = "menu";
    }
  } else if (state === "ask_delivery_ref") {
    if (isBack) {
      reply = MAIN_MENU;
      nextState = "menu";
    } else {
      reply = await deliveryStatus(admin, bodyRaw);
      nextState = "menu";
    }
  }

  // save session + log outbound
  await admin
    .from("wa_sessions")
    .upsert(
      { phone, state: nextState, updated_at: new Date().toISOString() },
      { onConflict: "phone" }
    );
  admin
    .from("wa_messages")
    .insert({ phone, direction: "out", body: reply })
    .then(() => {}, () => {});

  return twiml(reply);
}
