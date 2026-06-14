export default function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <defs>
        <linearGradient id="logoGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FF2D95" />
          <stop offset="1" stopColor="#FFD23F" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#logoGrad)" />
      <g fill="none" stroke="#fff" strokeWidth="2.3" strokeLinecap="round">
        <circle cx="32" cy="32" r="14.5" />
        <line x1="32" y1="32" x2="25.5" y2="28.5" />
        <line x1="32" y1="32" x2="41" y2="27" />
      </g>
      <circle cx="32" cy="32" r="1.8" fill="#fff" />
    </svg>
  )
}
