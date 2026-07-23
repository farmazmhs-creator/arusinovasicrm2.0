/**
 * Arus Inovasi logo.
 *
 * TODO: swap for the official asset - drop the file at /public/logo.png
 * and replace the markup below with an img tag.
 * Colours here are taken from the official logo: amber #FDB813, purple #3B1053.
 */

type Size = "sm" | "md" | "lg";

const SIZES: Record<
  Size,
  { mark: number; arus: string; inovasi: string; gap: string }
> = {
  sm: { mark: 32, arus: "text-lg", inovasi: "text-xs", gap: "gap-2" },
  md: { mark: 44, arus: "text-2xl", inovasi: "text-sm", gap: "gap-2.5" },
  lg: { mark: 68, arus: "text-4xl", inovasi: "text-xl", gap: "gap-3" },
};

export default function Logo({
  compact = false,
  size = "md",
}: {
  compact?: boolean;
  size?: Size;
}) {
  const s = SIZES[size];
  return (
    <div className={`flex items-center ${s.gap}`}>
      <svg
        viewBox="0 0 48 48"
        className="shrink-0"
        width={s.mark}
        height={s.mark}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="arusRing" x1="0%" y1="0%" x2="60%" y2="100%">
            <stop offset="0%" stopColor="#FDB813" />
            <stop offset="45%" stopColor="#F26522" />
            <stop offset="100%" stopColor="#3B1053" />
          </linearGradient>
        </defs>
        <circle
          cx="24"
          cy="24"
          r="19"
          fill="none"
          stroke="url(#arusRing)"
          strokeWidth="4"
        />
        <path
          d="M14 31 L22 17 L26 24"
          fill="none"
          stroke="url(#arusRing)"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M30 18 L30 31"
          stroke="url(#arusRing)"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
      </svg>

      {!compact && (
        <span className="leading-none">
          <span className={`block font-bold lowercase text-arus-amber ${s.arus}`}>
            arus
          </span>
          <span
            className={`block font-semibold uppercase tracking-[0.18em] text-white ${s.inovasi}`}
          >
            inovasi
          </span>
        </span>
      )}
    </div>
  );
}
