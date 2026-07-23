import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Sends one WhatsApp message through Twilio to prove the pipe works.
 * Credentials come from Vercel environment variables — never the codebase.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;

  // Which of the three is missing, so setup problems are obvious.
  const missing = [
    !sid && "TWILIO_ACCOUNT_SID",
    !token && "TWILIO_AUTH_TOKEN",
    !from && "TWILIO_WHATSAPP_FROM",
  ].filter(Boolean);
  if (missing.length) {
    return NextResponse.json(
      {
        error: `Twilio isn't fully set up. Missing in Vercel: ${missing.join(
          ", "
        )}. Add it, then redeploy.`,
      },
      { status: 500 }
    );
  }

  const body = await request.json().catch(() => ({}));

  // Normalise the destination into WhatsApp E.164 form.
  let to = String(body.to || "").trim().replace(/[\s()-]/g, "");
  if (!to)
    return NextResponse.json(
      { error: "Enter the WhatsApp number to send to." },
      { status: 400 }
    );
  if (!to.startsWith("whatsapp:")) {
    if (!to.startsWith("+")) to = "+" + to;
    to = "whatsapp:" + to;
  }

  const params = new URLSearchParams({
    To: to,
    From: from as string,
    Body:
      body.message ||
      "✅ Test from Arus Inovasi CRM — WhatsApp is connected and working.",
  });

  let resp: Response;
  try {
    resp = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization:
            "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      }
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: "Couldn't reach Twilio. " + (e?.message ?? "") },
      { status: 502 }
    );
  }

  const data = await resp.json().catch(() => ({}));

  if (!resp.ok) {
    // Surface Twilio's own words plus its error code + help link.
    return NextResponse.json(
      {
        error: data.message || "Twilio rejected the message.",
        code: data.code,
        help: data.more_info,
      },
      { status: 400 }
    );
  }

  return NextResponse.json({
    ok: true,
    message_sid: data.sid,
    status: data.status,
    to,
  });
}
