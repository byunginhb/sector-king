export function SectorKingLogo({ className = '', size = 32 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Sector King 로고"
    >
      <defs>
        <linearGradient id="sk-grad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2563EB" />
          <stop offset="1" stopColor="#0EA5E9" />
        </linearGradient>
      </defs>

      {/* Simple crown */}
      <path
        d="M8 48 L8 24 L20 36 L32 16 L44 36 L56 24 L56 48 Z"
        fill="url(#sk-grad)"
      />
      <circle cx="8" cy="22" r="3" fill="url(#sk-grad)" />
      <circle cx="32" cy="14" r="3" fill="url(#sk-grad)" />
      <circle cx="56" cy="22" r="3" fill="url(#sk-grad)" />
      <rect x="6" y="50" width="52" height="6" rx="2" fill="url(#sk-grad)" />
    </svg>
  )
}
