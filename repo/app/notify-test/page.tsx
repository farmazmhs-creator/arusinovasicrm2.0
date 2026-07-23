"use client";

import { useState } from "react";
import { MessageCircle, CheckCircle2, AlertTriangle } from "lucide-react";

export default function NotifyTestPage() {
  const [to, setTo] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<
    | { ok: true; sid: string; status: string }
    | { ok: false; error: string; code?: number; help?: string }
    | null
  >(null);

  async function send() {
    setResult(null);
    if (!to.trim()) return;
    setSending(true);
    const res = await fetch("/api/notify/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to }),
    });
    const data = await res.json();
    setSending(false);
    if (res.ok) {
      setResult({ ok: true, sid: data.message_sid, status: data.status });
    } else {
      setResult({
        ok: false,
        error: data.error ?? "Something went wrong.",
        code: data.code,
        help: data.help,
      });
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">
          WhatsApp Test
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Send yourself one message to confirm the CRM can reach WhatsApp.
        </p>
      </div>

      <div className="card">
        <label className="label">Your WhatsApp number</label>
        <input
          className="input"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          placeholder="+60 12 345 6789"
        />
        <p className="mt-2 text-xs text-slate-500">
          Include your country code (e.g. +60 for Malaysia). This must be a phone
          that has already joined the Twilio sandbox.
        </p>

        <button
          onClick={send}
          disabled={sending || !to.trim()}
          className="btn-accent mt-4 w-full"
        >
          <MessageCircle style={{ width: 16, height: 16 }} />
          {sending ? "Sending…" : "Send test WhatsApp"}
        </button>

        {result?.ok && (
          <div className="mt-4 flex items-start gap-2 rounded-lg bg-emerald-50 px-3 py-3 text-sm text-emerald-800">
            <CheckCircle2
              style={{ width: 18, height: 18 }}
              className="mt-0.5 shrink-0"
            />
            <div>
              <p className="font-semibold">Sent — check your phone.</p>
              <p className="mt-0.5 text-xs text-emerald-700">
                Twilio status: {result.status} · id {result.sid}
              </p>
            </div>
          </div>
        )}

        {result && !result.ok && (
          <div className="mt-4 flex items-start gap-2 rounded-lg bg-rose-50 px-3 py-3 text-sm text-rose-800">
            <AlertTriangle
              style={{ width: 18, height: 18 }}
              className="mt-0.5 shrink-0"
            />
            <div>
              <p className="font-semibold">Didn&apos;t send</p>
              <p className="mt-0.5">{result.error}</p>
              {result.code && (
                <p className="mt-1 text-xs text-rose-600">
                  Twilio error {result.code}
                  {result.help ? (
                    <>
                      {" "}
                      ·{" "}
                      <a
                        href={result.help}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                      >
                        what this means
                      </a>
                    </>
                  ) : null}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <p className="mt-4 text-xs text-slate-400">
        This is a temporary test page. Once WhatsApp is proven, the same sending
        works quietly behind the Action Centre and the daily digest.
      </p>
    </div>
  );
}
