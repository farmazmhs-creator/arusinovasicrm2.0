"use client";

import { useMemo, useState } from "react";

export type SortDir = "asc" | "desc";

/** Read a possibly-nested key like "products.name" off an object. */
function get(obj: any, key: string) {
  return key.split(".").reduce((v, k) => (v == null ? v : v[k]), obj);
}

/**
 * Generic client-side table sort. Returns the sorted rows plus the current
 * key/direction and a toggle() to wire to column headers. Nulls sort last;
 * numbers sort numerically, everything else naturally (numeric-aware).
 */
export function useSort<T>(
  rows: T[],
  initialKey: string | null = null,
  initialDir: SortDir = "asc"
) {
  const [sortKey, setSortKey] = useState<string | null>(initialKey);
  const [dir, setDir] = useState<SortDir>(initialDir);

  const sorted = useMemo(() => {
    if (!sortKey) return rows;
    const out = [...rows].sort((a, b) => {
      const av = get(a, sortKey);
      const bv = get(b, sortKey);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      let c: number;
      if (typeof av === "number" && typeof bv === "number") c = av - bv;
      else
        c = String(av).localeCompare(String(bv), undefined, { numeric: true });
      return dir === "asc" ? c : -c;
    });
    return out;
  }, [rows, sortKey, dir]);

  function toggle(key: string) {
    if (sortKey === key) setDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setDir("asc");
    }
  }

  return { sorted, sortKey, dir, toggle };
}
