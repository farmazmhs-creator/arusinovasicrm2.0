"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FileText, Upload, ExternalLink, Trash2, Paperclip } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime } from "@/lib/format";

const BUCKET = "quote-docs";
const MAX_MB = 20;

type Doc = {
  id: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  uploaded_at: string;
  url: string | null;
  user_profiles?: { name: string } | null;
};

function prettySize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function QuoteDocuments({
  quotationId,
  quoteNumber,
}: {
  quotationId: string;
  quoteNumber: string;
}) {
  const supabase = createClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/quotations/${quotationId}/documents`);
    const json = await res.json();
    setDocs(json.data ?? []);
    setLoading(false);
  }, [quotationId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleFile(file: File) {
    setError(null);

    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`File is larger than ${MAX_MB} MB.`);
      return;
    }

    setUploading(true);

    // Upload straight to Supabase Storage from the browser, then record metadata.
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${quotationId}/${Date.now()}-${safeName}`;

    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { upsert: false });

    if (upErr) {
      setUploading(false);
      setError(upErr.message);
      return;
    }

    const res = await fetch(`/api/quotations/${quotationId}/documents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        file_path: path,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
      }),
    });

    setUploading(false);
    if (!res.ok) {
      const j = await res.json();
      setError(j.error ?? "Failed to save document.");
      return;
    }

    if (inputRef.current) inputRef.current.value = "";
    load();
  }

  async function remove(docId: string) {
    if (!confirm("Remove this document?")) return;
    await fetch(`/api/quotations/${quotationId}/documents?docId=${docId}`, {
      method: "DELETE",
    });
    load();
  }

  return (
    <div className="card">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <Paperclip style={{ width: 15, height: 15 }} />
          Quotation Document
        </h2>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="btn-accent"
        >
          <Upload style={{ width: 15, height: 15 }} />
          {uploading ? "Uploading…" : "Upload"}
        </button>
      </div>
      <p className="mb-4 text-xs text-slate-500">
        Ops uploads the actual quote produced in the quoting system, so it can be
        viewed here alongside {quoteNumber}. PDF, Excel or image, up to {MAX_MB}{" "}
        MB.
      </p>

      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept=".pdf,.xlsx,.xls,.csv,.doc,.docx,.png,.jpg,.jpeg"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />

      {error && (
        <p className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      )}

      <div className="space-y-2">
        {docs.map((d) => (
          <div
            key={d.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="rounded-lg bg-arus-purple/10 p-2 text-arus-purple">
                <FileText style={{ width: 16, height: 16 }} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-800">
                  {d.file_name}
                </p>
                <p className="text-xs text-slate-400">
                  {prettySize(d.file_size)}
                  {d.user_profiles?.name ? ` · ${d.user_profiles.name}` : ""} ·{" "}
                  {formatDateTime(d.uploaded_at)}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {d.url && (
                <a
                  href={d.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-md p-2 text-slate-400 hover:bg-slate-50 hover:text-arus-purple"
                  title="View document"
                >
                  <ExternalLink style={{ width: 15, height: 15 }} />
                </a>
              )}
              <button
                onClick={() => remove(d.id)}
                className="rounded-md p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                title="Remove"
              >
                <Trash2 style={{ width: 15, height: 15 }} />
              </button>
            </div>
          </div>
        ))}

        {docs.length === 0 && (
          <p className="rounded-lg border border-dashed border-slate-200 px-3 py-6 text-center text-sm text-slate-400">
            {loading ? "Loading…" : "No quotation uploaded yet."}
          </p>
        )}
      </div>
    </div>
  );
}
