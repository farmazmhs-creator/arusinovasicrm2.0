export function formatMYR(value: number | null | undefined): string {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    minimumFractionDigits: 2,
  }).format(Number(value ?? 0));
}

export function formatMYRShort(value: number | null | undefined): string {
  const n = Number(value ?? 0);
  if (n >= 1_000_000) return `RM ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `RM ${(n / 1_000).toFixed(1)}k`;
  return `RM ${n.toFixed(0)}`;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Turnaround between two timestamps, humanised. */
export function turnaround(
  from: string | null | undefined,
  to: string | null | undefined
): string {
  if (!from || !to) return "—";
  const ms = new Date(to).getTime() - new Date(from).getTime();
  if (isNaN(ms) || ms < 0) return "—";
  const hrs = ms / 3_600_000;
  if (hrs < 1) return `${Math.round(ms / 60_000)} min`;
  if (hrs < 48) return `${hrs.toFixed(1)} hrs`;
  return `${(hrs / 24).toFixed(1)} days`;
}

export function formatHours(h: number | null | undefined): string {
  const n = Number(h ?? 0);
  if (n === 0) return "—";
  if (n < 48) return `${n.toFixed(1)} hrs`;
  return `${(n / 24).toFixed(1)} days`;
}

export const STATUS_LABELS: Record<string, string> = {
  received: "Received",
  in_progress: "In Progress",
  completed: "Completed",
  sent_to_customer: "Sent to Customer",
  on_hold_vendor: "On Hold — Vendor",
  on_hold_sales_rep: "On Hold — Sales Rep",
  on_hold_director: "On Hold — Director",
  cancelled: "Cancelled",
  pending: "Pending",
  partial: "Partial",
  delivered: "Delivered",
};

const STATUS_COLORS: Record<string, string> = {
  received: "bg-slate-100 text-slate-700",
  in_progress: "bg-blue-100 text-blue-800",
  completed: "bg-emerald-100 text-emerald-800",
  sent_to_customer: "bg-teal-100 text-teal-800",
  on_hold_vendor: "bg-orange-100 text-orange-800",
  on_hold_sales_rep: "bg-amber-100 text-amber-900",
  on_hold_director: "bg-purple-100 text-purple-800",
  cancelled: "bg-rose-100 text-rose-800",
  pending: "bg-amber-100 text-amber-800",
  partial: "bg-orange-100 text-orange-800",
  delivered: "bg-emerald-100 text-emerald-800",
};

export function statusClass(status: string): string {
  return STATUS_COLORS[status] ?? "bg-slate-100 text-slate-700";
}

export function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}
