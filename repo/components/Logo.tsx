/**
 * Arus Inovasi logo — the real asset at /public/logo.png.
 *
 * The wordmark's "INOVASI" is dark purple, so on the purple sidebar / login
 * background it's placed on a white badge to stay crisp and legible.
 */

type Size = "sm" | "md" | "lg";

const HEIGHT: Record<Size, string> = {
  sm: "h-10", // ~40px
  md: "h-16", // ~64px — sidebar
  lg: "h-28", // ~112px — login
};

export default function Logo({
  size = "md",
  chip = true,
}: {
  size?: Size;
  chip?: boolean;
  /** kept for backwards-compat with older callers */
  compact?: boolean;
}) {
  // eslint-disable-next-line @next/next/no-img-element
  const img = (
    <img
      src="/logo.png"
      alt="Arus Inovasi"
      className={`${HEIGHT[size]} w-auto`}
    />
  );

  if (!chip) return img;

  return (
    <span className="inline-flex items-center rounded-xl bg-white px-4 py-3 shadow-sm">
      {img}
    </span>
  );
}
