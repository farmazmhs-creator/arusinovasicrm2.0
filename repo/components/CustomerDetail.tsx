"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Star,
  Phone,
  Mail,
  Building2,
} from "lucide-react";

type Contact = {
  id: string;
  name: string;
  department: string | null;
  title: string | null;
  phone: string | null;
  email: string | null;
  is_primary: boolean;
};

type Customer = {
  id: string;
  hospital_name: string;
  state: string | null;
  area: string | null;
  contacts: Contact[];
};

export default function CustomerDetail({ id }: { id: string }) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nc, setNc] = useState({
    name: "",
    department: "",
    title: "",
    phone: "",
    email: "",
    is_primary: false,
  });

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/customers/${id}`);
    const json = await res.json();
    setCustomer(json.data ?? null);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function addContact(e: React.FormEvent) {
    e.preventDefault();
    if (!nc.name.trim()) return;
    setSaving(true);
    await fetch(`/api/customers/${id}/contacts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nc),
    });
    setSaving(false);
    setShowAdd(false);
    setNc({
      name: "",
      department: "",
      title: "",
      phone: "",
      email: "",
      is_primary: false,
    });
    load();
  }

  async function setPrimary(contactId: string) {
    await fetch(`/api/customers/${id}/contacts?contactId=${contactId}`, {
      method: "PATCH",
    });
    load();
  }

  async function removeContact(contactId: string) {
    if (!confirm("Remove this contact?")) return;
    await fetch(`/api/customers/${id}/contacts?contactId=${contactId}`, {
      method: "DELETE",
    });
    load();
  }

  if (loading && !customer)
    return <p className="text-sm text-slate-400">Loading…</p>;
  if (!customer)
    return <p className="text-sm text-slate-400">Customer not found.</p>;

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/customers"
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft style={{ width: 15, height: 15 }} /> Back to customers
      </Link>

      <div className="mb-6 flex items-start gap-3">
        <span className="rounded-xl bg-arus-purple/10 p-3 text-arus-purple">
          <Building2 style={{ width: 22, height: 22 }} />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {customer.hospital_name}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {[customer.area, customer.state].filter(Boolean).join(", ") || "—"}
          </p>
        </div>
      </div>

      <div className="card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">
            Contacts ({customer.contacts.length})
          </h2>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="btn-secondary"
          >
            <Plus style={{ width: 15, height: 15 }} /> Add contact
          </button>
        </div>

        {showAdd && (
          <form
            onSubmit={addContact}
            className="mb-4 rounded-lg border border-slate-200 p-4"
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="label">Name</label>
                <input
                  className="input"
                  value={nc.name}
                  onChange={(e) => setNc({ ...nc, name: e.target.value })}
                  placeholder="Dr. Rajesh"
                />
              </div>
              <div>
                <label className="label">Department</label>
                <input
                  className="input"
                  value={nc.department}
                  onChange={(e) =>
                    setNc({ ...nc, department: e.target.value })
                  }
                  placeholder="OT / ICU / Urology"
                />
              </div>
              <div>
                <label className="label">Phone</label>
                <input
                  className="input"
                  value={nc.phone}
                  onChange={(e) => setNc({ ...nc, phone: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Email</label>
                <input
                  className="input"
                  value={nc.email}
                  onChange={(e) => setNc({ ...nc, email: e.target.value })}
                />
              </div>
            </div>
            <label className="mt-3 flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={nc.is_primary}
                onChange={(e) =>
                  setNc({ ...nc, is_primary: e.target.checked })
                }
              />
              Make this the primary contact
            </label>
            <div className="mt-3 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="btn-primary"
              >
                {saving ? "Saving…" : "Add"}
              </button>
            </div>
          </form>
        )}

        <div className="divide-y divide-slate-100">
          {customer.contacts.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between gap-3 py-3"
            >
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-medium text-slate-800">
                  {c.name}
                  {c.is_primary && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-900">
                      <Star style={{ width: 11, height: 11 }} /> Primary
                    </span>
                  )}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {c.department ?? "—"}
                  {c.phone ? (
                    <span className="ml-2 inline-flex items-center gap-1">
                      <Phone style={{ width: 11, height: 11 }} />
                      {c.phone}
                    </span>
                  ) : null}
                  {c.email ? (
                    <span className="ml-2 inline-flex items-center gap-1">
                      <Mail style={{ width: 11, height: 11 }} />
                      {c.email}
                    </span>
                  ) : null}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {!c.is_primary && (
                  <button
                    onClick={() => setPrimary(c.id)}
                    className="rounded-md p-2 text-slate-400 hover:bg-amber-50 hover:text-amber-600"
                    title="Make primary"
                  >
                    <Star style={{ width: 15, height: 15 }} />
                  </button>
                )}
                <button
                  onClick={() => removeContact(c.id)}
                  className="rounded-md p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                  title="Remove"
                >
                  <Trash2 style={{ width: 15, height: 15 }} />
                </button>
              </div>
            </div>
          ))}
          {customer.contacts.length === 0 && (
            <p className="py-6 text-center text-sm text-slate-400">
              No contacts yet — add the first one above.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
