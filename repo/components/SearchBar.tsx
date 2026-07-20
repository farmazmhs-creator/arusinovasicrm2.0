"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

/**
 * Shared search for the Quotation and Purchase Order lists.
 * Searches by serial number or customer, plus a received/created date range.
 */
export default function SearchBar({
  basePath,
  placeholder,
}: {
  basePath: string;
  placeholder: string;
}) {
  const router = useRouter();
  const params = useSearchParams();

  const [q, setQ] = useState(params.get("q") ?? "");
  const [from, setFrom] = useState(params.get("from") ?? "");
  const [to, setTo] = useState(params.get("to") ?? "");

  function apply(e?: React.FormEvent) {
    e?.preventDefault();
    const next = new URLSearchParams();
    const status = params.get("status");
    if (status) next.set("status", status);
    if (q.trim()) next.set("q", q.trim());
    if (from) next.set("from", from);
    if (to) next.set("to", to);
    router.push(`${basePath}?${next.toString()}`);
  }

  function clear() {
    setQ("");
    setFrom("");
    setTo("");
    const status = params.get("status");
    router.push(status ? `${basePath}?status=${status}` : basePath);
  }

  const dirty = Boolean(q || from || to);

  return (
    <form
      onSubmit={apply}
      className="card mb-4 flex flex-wrap items-end gap-3"
    >
      <div className="relative min-w-[240px] flex-1">
        <label className="label">Search</label>
        <Search
          style={{ width: 15, height: 15 }}
          className="absolute left-3 top-[34px] text-slate-400"
        />
        <input
          className="input pl-9"
          placeholder={placeholder}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div>
        <label className="label">From date</label>
        <input
          type="date"
          className="input"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
      </div>

      <div>
        <label className="label">To date</label>
        <input
          type="date"
          className="input"
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />
      </div>

      <button type="submit" className="btn-primary">
        Search
      </button>
      {dirty && (
        <button type="button" onClick={clear} className="btn-secondary">
          <X style={{ width: 15, height: 15 }} /> Clear
        </button>
      )}
    </form>
  );
}
