/**
 * Sector King mark — editorial crown.
 *
 * Single ink color (currentColor) so the mark inherits text color and adapts
 * to light/dark + accent contexts automatically. No gradient, no glow.
 * The crown is etched with a 1px hairline base rule, matching the rest of
 * the design system. Pair with `text-primary` for the amber signature.
 */
export function SectorKingLogo({
  className = '',
  size = 32,
}: {
  className?: string
  size?: number
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`text-primary ${className}`}
      aria-label="Sector King mark"
    >
      {/* base rule — newspaper hairline */}
      <rect x="6" y="51" width="52" height="2" fill="currentColor" />

      {/* crown silhouette, drawn as a single ink shape */}
      <path
        d="M8 48 L8 26 L20 36 L32 16 L44 36 L56 26 L56 48 Z"
        fill="currentColor"
      />

      {/* three pearls — outlined, not filled, to keep the mark dry */}
      <circle cx="8" cy="22" r="2.5" fill="currentColor" />
      <circle cx="32" cy="13" r="2.5" fill="currentColor" />
      <circle cx="56" cy="22" r="2.5" fill="currentColor" />

      {/* serif-ish notch on the band — subtle editorial detail */}
      <rect x="30" y="44" width="4" height="4" fill="hsl(var(--background))" />
    </svg>
  )
}
