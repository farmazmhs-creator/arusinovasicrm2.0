import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, Circle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  formatMYR,
  formatDateTime,
  turnaround,
  statusLabel,
} from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";
import QuotationActions from "@/components/QuotationActions";
import QuoteDocuments from "@/components/QuoteDocuments";
import type { Quotation, QuotationItem } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function QuotationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: quote } = await supabase
    .from("quotations")
    .select(
      "id, quote_number, status, total_amount, discount_pct, received_at, in_progress_at, completed_at, sent_at, source, external_ref, hold_note, processed_by, customers(name, hospital_name), sales_reps(name, code), processed:user_profiles!quotations_processed_by_fkey(name)"
    )
    .eq("id", id)
    .single();

  if (!quote) notFound();
  const q = quote as unknown as Quotation;

  const [{ data: itemData }, { data: history }] = await Promise.all([
    supabase
      .from("quotation_items")
      .select("id, quantity, unit_price, line_total, products(name, sku)")
      .eq("quotation_id", id),
    supabase
      .from("quotation_status_history")
      .select("id, from_status, to_status, changed_at")
      .eq("quotation_id", id)
      .order("changed_at", { ascending: true }),
  ]);

  const items = (itemData as unknown as QuotationItem[]) ?? [];

  const steps = [
    { label: "Received", at: q.received_at },
    { label: "In Progress", at: q.in_progress_at },
    { label: "Completed", at: q.completed_at },
    { label: "Sent to Customer", at: q.sent_at },
  ];

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/quotations"
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft style={{ width: 15, height: 15 }} /> Back to quote requests
      </Link>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {q.quote_number}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Received {formatDateTime(q.received_at)} · via {q.source}
          </p>
        </div>
        <StatusBadge status={q.status} />
      </div>

      {/* Turnaround summary */}
      <div className="card mb-6">
        <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-5">
          <div>
            <p className="text-xs uppercase text-slate-400">Customer</p>
            <p className="mt-1 font-medium text-slate-800">
              {q.customers?.hospital_name ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-400">Requested By</p>
            <p className="mt-1 font-medium text-slate-800">
              {q.sales_reps?.name ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-400">Processed By</p>
            <p className="mt-1 font-medium text-slate-800">
              {q.processed?.name ?? (
                <span className="text-slate-300">Unassigned</span>
              )}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-400">Turnaround</p>
            <p className="mt-1 font-bold text-arus-orange">
              {turnaround(q.received_at, q.completed_at)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-400">Value</p>
            <p className="mt-1 font-medium text-slate-800">
              {formatMYR(q.total_amount)}
            </p>
          </div>
        </div>

        {/* Progress timeline */}
        <div className="flex flex-wrap items-start gap-1 border-t border-slate-100 pt-5">
          {steps.map((s, i) => {
            const done = Boolean(s.at);
            return (
              <div key={s.label} className="flex items-start">
                <div className="w-32">
                  <div className="flex items-center gap-1.5">
                    {done ? (
                      <Check
                        style={{ width: 15, height: 15 }}
                        className="text-emerald-600"
                      />
                    ) : (
                      <Circle
                        style={{ width: 13, height: 13 }}
                        className="text-slate-300"
                      />
                    )}
                    <span
                      className={`text-xs font-semibold ${
                        done ? "text-slate-800" : "text-slate-400"
                      }`}
                    >
                      {s.label}
                    </span>
                  </div>
                  <p className="mt-1 pl-5 text-[11px] text-slate-400">
                    {s.at ? formatDateTime(s.at) : "Pending"}
                  </p>
                </div>
                {i < steps.length - 1 && (
                  <div className="mt-2 h-px w-6 bg-slate-200" />
                )}
              </div>
            );
          })}
        </div>

        {q.hold_note && (
          <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <span className="font-semibold">On hold:</span> {q.hold_note}
          </p>
        )}
      </div>

      {/* Uploaded quotation document */}
      <div className="mb-6">
        <QuoteDocuments quotationId={q.id} quoteNumber={q.quote_number} />
      </div>

      {/* Items */}
      <div className="card mb-6">
        <h2 className="mb-1 text-sm font-semibold text-slate-800">
          Requested Items
        </h2>
        <p className="mb-3 text-xs text-slate-500">
          Drives inventory reservation once this request is completed
        </p>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead>
              <tr>
                <th className="th">Product</th>
                <th className="th">Qty</th>
                <th className="th">Unit Price</th>
                <th className="th text-right">Line Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((it) => (
                <tr key={it.id}>
                  <td className="td">{it.products?.name ?? "—"}</td>
                  <td className="td">{it.quantity}</td>
                  <td className="td">{formatMYR(it.unit_price)}</td>
                  <td className="td text-right">{formatMYR(it.line_total)}</td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td className="td text-slate-400" colSpan={4}>
                    No items recorded on this request.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* History */}
      {(history ?? []).length > 0 && (
        <div className="card mb-6">
          <h2 className="mb-3 text-sm font-semibold text-slate-800">
            Status History
          </h2>
          <ol className="space-y-2">
            {(history ?? []).map((h: any) => (
              <li key={h.id} className="flex items-center gap-3 text-sm">
                <span className="w-40 shrink-0 text-xs text-slate-400">
                  {formatDateTime(h.changed_at)}
                </span>
                <span className="text-slate-600">
                  {h.from_status
                    ? `${statusLabel(h.from_status)} → ${statusLabel(h.to_status)}`
                    : statusLabel(h.to_status)}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="card">
        <h2 className="mb-3 text-sm font-semibold text-slate-800">Actions</h2>
        <QuotationActions
          id={q.id}
          status={q.status}
          holdNote={q.hold_note ?? null}
        />
      </div>
    </div>
  );
}
