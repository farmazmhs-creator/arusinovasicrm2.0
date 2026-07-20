import { Suspense } from "react";
import Link from "next/link";
import { Plus, Paperclip } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatMYR, turnaround } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";
import FilterTabs from "@/components/FilterTabs";
import SearchBar from "@/components/SearchBar";

export const dynamic = "force-dynamic";

const OPEN = [
  "received",
  "in_progress",
  "on_hold_vendor",
  "on_hold_sales_rep",
  "on_hold_director",
];

export default async function QuotationsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    q?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const { status = "all", q, from, to } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("quotations")
    .select(
      "id, quote_number, status, total_amount, received_at, completed_at, customers(hospital_name), sales_reps(name), processed:user_profiles!quotations_processed_by_fkey(name)"
    )
    .order("received_at", { ascending: false })
    .limit(100);

  if (status === "open") query = query.in("status", OPEN);
  else if (status === "on_hold")
    query = query.in("status", [
      "on_hold_vendor",
      "on_hold_sales_rep",
      "on_hold_director",
    ]);
  else if (status !== "all") query = query.eq("status", status);

  if (from) query = query.gte("received_at", from);
  if (to) query = query.lte("received_at", `${to}T23:59:59`);

  // Search by quote number or customer name
  if (q) {
    const { data: matches } = await supabase
      .from("customers")
      .select("id")
      .ilike("hospital_name", `%${q}%`);
    const ids = (matches ?? []).map((m) => m.id);
    const clauses = [`quote_number.ilike.%${q}%`];
    if (ids.length) clauses.push(`customer_id.in.(${ids.join(",")})`);
    query = query.or(clauses.join(","));
  }

  const { data, error } = await query;
  const rows = (data as any[]) ?? [];

  const ids = rows.map((r) => r.id);
  const { data: docs } = ids.length
    ? await supabase
        .from("quote_documents")
        .select("quotation_id")
        .in("quotation_id", ids)
    : { data: [] as { quotation_id: string }[] };
  const hasDoc = new Set((docs ?? []).map((d) => d.quotation_id));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quote Requests</h1>
          <p className="mt-1 text-sm text-slate-500">
            Tracking summary of every request received · {rows.length} shown
          </p>
        </div>
        <Link href="/quotations/create" className="btn-accent">
          <Plus style={{ width: 16, height: 16 }} /> New Request
        </Link>
      </div>

      <Suspense fallback={null}>
        <SearchBar
          basePath="/quotations"
          placeholder="Quote number or customer…"
        />
      </Suspense>

      <div className="mb-4">
        <FilterTabs
          basePath="/quotations"
          current={status}
          options={[
            { value: "all", label: "All" },
            { value: "open", label: "Open" },
            { value: "received", label: "Received" },
            { value: "in_progress", label: "In Progress" },
            { value: "on_hold", label: "On Hold" },
            { value: "completed", label: "Completed" },
            { value: "sent_to_customer", label: "Sent" },
          ]}
        />
      </div>

      {error && (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error.message}
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="th">Quote #</th>
              <th className="th">Customer</th>
              <th className="th">Requested By</th>
              <th className="th">Processed By</th>
              <th className="th text-right">Quote Amount</th>
              <th className="th">Status</th>
              <th className="th">Turnaround</th>
              <th className="th"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="td whitespace-nowrap font-medium text-slate-900">
                  <span className="inline-flex items-center gap-1.5">
                    {r.quote_number}
                    {hasDoc.has(r.id) && (
                      <Paperclip
                        style={{ width: 13, height: 13 }}
                        className="text-arus-orange"
                      />
                    )}
                  </span>
                </td>
                <td className="td">{r.customers?.hospital_name ?? "—"}</td>
                <td className="td">{r.sales_reps?.name ?? "—"}</td>
                <td className="td">
                  {r.processed?.name ?? (
                    <span className="text-slate-300">Unassigned</span>
                  )}
                </td>
                <td className="td whitespace-nowrap text-right font-medium">
                  {formatMYR(r.total_amount)}
                </td>
                <td className="td">
                  <StatusBadge status={r.status} />
                </td>
                <td className="td whitespace-nowrap">
                  {turnaround(r.received_at, r.completed_at)}
                </td>
                <td className="td whitespace-nowrap text-right">
                  <Link
                    href={`/quotations/${r.id}`}
                    className="font-medium text-arus-purple hover:underline"
                  >
                    View more
                  </Link>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="td text-slate-400" colSpan={8}>
                  No quote requests match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
