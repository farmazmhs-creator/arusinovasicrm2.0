import Link from "next/link";

export default function FilterTabs({
  basePath,
  current,
  options,
}: {
  basePath: string;
  current: string;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = current === o.value;
        const href =
          o.value === "all" ? basePath : `${basePath}?status=${o.value}`;
        return (
          <Link
            key={o.value}
            href={href}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              active
                ? "bg-arus-purple text-white"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {o.label}
          </Link>
        );
      })}
    </div>
  );
}
