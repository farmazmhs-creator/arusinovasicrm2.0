"use client";

import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import type { SortDir } from "@/lib/useSort";

/** A clickable, sort-aware table header cell. Pairs with useSort(). */
export default function SortableTh({
  label,
  sortKey,
  activeKey,
  dir,
  onSort,
  align = "left",
  className = "",
}: {
  label: React.ReactNode;
  sortKey: string;
  activeKey: string | null;
  dir: SortDir;
  onSort: (key: string) => void;
  align?: "left" | "right";
  className?: string;
}) {
  const active = activeKey === sortKey;
  const Icon = !active ? ChevronsUpDown : dir === "asc" ? ChevronUp : ChevronDown;
  return (
    <th
      onClick={() => onSort(sortKey)}
      className={`th cursor-pointer select-none hover:text-arus-purple ${
        align === "right" ? "text-right" : ""
      } ${className}`}
    >
      <span
        className={`inline-flex items-center gap-1 ${
          align === "right" ? "flex-row-reverse" : ""
        }`}
      >
        {label}
        <Icon
          style={{ width: 13, height: 13 }}
          className={active ? "text-arus-purple" : "text-slate-300"}
        />
      </span>
    </th>
  );
}
