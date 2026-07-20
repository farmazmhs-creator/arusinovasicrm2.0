/**
 * Arus Inovasi logo.
 *
 * TODO: swap for the official asset — drop the file at /public/logo.png (or .svg)
 * and replace the markup below with:
 *   <img src="/logo.png" alt="Arus Inovasi" className={...} />
 * Colours here are taken from the official logo: amber #FDB813, purple #3B1053.
 */
export default function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <svg viewBox="0 0 48 48" className="h-8 w-8 shrink-0" aria-hidden="true">
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
          <span className="block text-lg font-bold lowercase text-arus-amber">
            arus
          </span>
          <span className="block text-sm font-semibold uppercase tracking-[0.18em] text-white">
            inovasi
          </span>
        </span>
      )}
    </div>
  );
}
