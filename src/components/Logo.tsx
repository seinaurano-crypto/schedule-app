export default function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <defs>
        <radialGradient id="puffy" cx="38%" cy="32%" r="70%">
          <stop offset="0%" stopColor="#FF9ED2" />
          <stop offset="45%" stopColor="#FF2D95" />
          <stop offset="100%" stopColor="#D4147A" />
        </radialGradient>
      </defs>
      {/* puffy body */}
      <circle cx="32" cy="33" r="25" fill="url(#puffy)" />
      {/* glossy highlight */}
      <ellipse cx="24" cy="20" rx="11" ry="7" fill="#fff" opacity="0.45" />
      {/* face */}
      <circle cx="32" cy="33" r="16" fill="#FFF9E6" />
      {/* hands */}
      <line x1="32" y1="33" x2="24" y2="25" stroke="#FF2D95" strokeWidth="3" strokeLinecap="round" />
      <line x1="32" y1="33" x2="41" y2="36" stroke="#D4147A" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="32" cy="33" r="2.6" fill="#D4147A" />
    </svg>
  )
}
