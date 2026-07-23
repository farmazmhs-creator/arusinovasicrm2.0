"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search, X, Building2, Users } from "lucide-react";

const STATES = [
  "Selangor", "Johor", "Perak", "Kelantan", "Pulau Pinang", "Kedah",
  "Melaka", "Terengganu", "Sabah", "Pahang", "Negeri Sembilan", "Perlis",
  "Sarawak", "Wilayah Persekutuan", "Putrajaya", "Labuan",
];

type Row = {
  id: string;
  hospital_name: string;
  state: string | null;
  area: string | null;
  contact_count: number;
  primary_contact: { name: string; department: string | null } | null;
};

export default function CustomersClient() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [nc, setNc] = useState({
    hospital_name: "",
    state: "",
    area: "",
    c_name: "",
    c_department: "",
    c_phone: "",
    c_email: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/customers");
    const json = await res.json();
    setRows(json.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function addCustomer(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!nc.hospital_name.trim()) {
      setError("Enter the hospital / customer name.");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hospital_name: nc.hospital_name,
        state: nc.state || null,
        area: nc.area || null,
        contact: nc.c_name
          ? {
              name: nc.c_name,
              department: nc.c_department,
              phone: nc.c_phone,
              email: nc.c_email,
            }
          : null,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const j = await res.json();
      setError(j.error ?? "Failed to add customer.");
      return;
    }
    setShowAdd(false);
    setNc({
      hospital_name: "",
      state: "",
      area: "",
      c_name: "",
      c_department: "",
      c_phone: "",
      c_email: "",
    });
    load();
  }

  const filtered = rows.filter((r) => {
    if (!q) return true;
    const n = q.toLowerCase();
    return (
      r.hospital_name.toLowerCase().includes(n) ||
      (r.state ?? "").toLowerCase().includes(n) ||
      (r.area ?? "").toLowerCase().includes(n) ||
      (r.primary_contact?.name ?? "").toLowerCase().includes(n)
    );
  });

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Customers</h1>
          <p className="mt-1 text-sm text-slate-500">
            {rows.length} hospital{rows.length === 1 ? "" : "s"} · each can have
            multiple department contacts
          </p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="btn-accent">
          {showAdd ? (
            <>
              <X style={{ width: 16, height: 16 }} /> Cancel
            </>
          ) : (
            <>
              <Plus style={{ width: 16, height: 16 }} /> Add Customer
            </>
          )}
        </button>
      </div>

      {showAdd && (
        <form onSubmit={addCustomer} className="card mb-6">
          <h2 className="mb-4 text-sm font-semibold text-slate-800">
            New customer
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="label">Hospital / customer name</label>
              <input
                className="input"
                value={nc.hospital_name}
                onChange={(e) =>
                  setNc({ ...nc, hospital_name: e.target.value })
                }
                placeholder="e.g. Hospital Kuala Lumpur"
              />
            </div>
            <div>
              <label className="label">State</label>
              <select
                className="input"
                value={nc.state}
                onChange={(e) => setNc({ ...nc, state: e.target.value })}
              >
                <option value="">Select…</option>
                {STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Area</label>
              <input
                className="input"
                value={nc.area}
                onChange={(e) => setNc({ ...nc, area: e.target.value })}
                placeholder="e.g. Bangsar"
              />
            </div>
          </div>

          <p className="mb-3 mt-5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            First contact (optional — add more later)
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div>
              <label className="label">Name</label>
              <input
                className="input"
                value={nc.c_name}
                onChange={(e) => setNc({ ...nc, c_name: e.target.value })}
                placeholder="Dr. Rajesh"
              />
            </div>
            <div>
              <label className="label">Department</label>
              <input
                className="input"
                value={nc.c_department}
                onChange={(e) =>
                  setNc({ ...nc, c_department: e.target.value })
                }
                placeholder="OT"
              />
            </div>
            <div>
              <label className="label">Phone</label>
              <input
                className="input"
                value={nc.c_phone}
                onChange={(e) => setNc({ ...nc, c_phone: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Email</label>
              <input
                className="input"
                value={nc.c_email}
                onChange={(e) => setNc({ ...nc, c_email: e.target.value })}
              />
            </div>
          </div>

          {error && (
            <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          )}

          <div className="mt-4 flex justify-end">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "Saving…" : "Add customer"}
            </button>
          </div>
        </form>
      )}

      <div className="relative mb-4 max-w-md">
        <Search
          style={{ width: 15, height: 15 }}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          className="input pl-9"
          placeholder="Search hospital, state, area or contact…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="th">Hospital</th>
              <th className="th">State</th>
              <th className="th">Area</th>
              <th className="th">Primary Contact</th>
              <th className="th">Contacts</th>
              <th className="th"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="td font-medium text-slate-900">
                  {r.hospital_name}
                </td>
                <td className="td">{r.state ?? "—"}</td>
                <td className="td">{r.area ?? "—"}</td>
                <td className="td">
                  {r.primary_contact ? (
                    <span>
                      {r.primary_contact.name}
                      {r.primary_contact.department ? (
                        <span className="text-slate-400">
                          {" "}
                          · {r.primary_contact.department}
                        </span>
                      ) : null}
                    </span>
                  ) : (
                    <span className="text-slate-300">None yet</span>
                  )}
                </td>
                <td className="td">
                  <span className="inline-flex items-center gap-1 text-slate-500">
                    <Users style={{ width: 13, height: 13 }} />
                    {r.contact_count}
                  </span>
                </td>
                <td className="td text-right">
                  <Link
                    href={`/customers/${r.id}`}
                    className="font-medium text-arus-purple hover:underline"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td className="td text-slate-400" colSpan={6}>
                  {loading ? "Loading…" : "No customers match."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
