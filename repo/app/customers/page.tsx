import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import type { Customer } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .order("hospital_name", { ascending: true })
    .limit(50);

  const rows = (data as Customer[]) ?? [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Customers</h1>
        <p className="mt-1 text-sm text-slate-500">
          {rows.length} hospital{rows.length === 1 ? "" : "s"}
        </p>
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
              <th className="th">Hospital Name</th>
              <th className="th">State</th>
              <th className="th">Area</th>
              <th className="th">Contact</th>
              <th className="th">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="td font-medium text-slate-900">
                  {c.hospital_name}
                </td>
                <td className="td">{c.state ?? "—"}</td>
                <td className="td">{c.area ?? "—"}</td>
                <td className="td">{c.contact_person ?? "—"}</td>
                <td className="td">{formatDate(c.created_at)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="td text-slate-400" colSpan={5}>
                  No customers found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
