import { statusClass, statusLabel } from "@/lib/format";

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${statusClass(
        status
      )}`}
    >
      {statusLabel(status)}
    </span>
  );
}
