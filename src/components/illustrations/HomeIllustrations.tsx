/**
 * Ilustraciones de línea propias, inspiradas en las referencias:
 * trazo negro grueso, rellenos lima y destellos.
 */
const STROKE = { stroke: 'var(--color-ink)', strokeWidth: 3.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
const LIME = 'var(--color-lime)';

function Sparks({ x, y, rot = 0 }: { x: number; y: number; rot?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`} stroke={LIME} strokeWidth="4.2" strokeLinecap="round">
      <path d="M0 -6 L0 -15" />
      <path d="M-11 -2 L-17 -9" />
      <path d="M11 -2 L17 -9" />
    </g>
  );
}

export function GiftIllustration({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 100" className={className} aria-hidden>
      <Sparks x={60} y={18} />
      <rect x="27" y="48" width="66" height="44" rx="5" fill="#fff" {...STROKE} />
      <rect x="21" y="35" width="78" height="15" rx="4" fill={LIME} {...STROKE} />
      <rect x="53" y="35" width="14" height="57" fill={LIME} {...STROKE} />
      <path d="M60 35 C48 18 33 24 38 33 C41 37 52 36 60 35 Z" fill={LIME} {...STROKE} />
      <path d="M60 35 C72 18 87 24 82 33 C79 37 68 36 60 35 Z" fill={LIME} {...STROKE} />
    </svg>
  );
}

export function HandStarIllustration({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 100" className={className} aria-hidden>
      <g stroke={LIME} strokeWidth="4.2" strokeLinecap="round">
        <path d="M30 22 L37 30" />
        <path d="M24 37 L34 39" />
        <path d="M27 52 L36 48" />
      </g>
      <path
        d="M70 8 L76.5 21 L90.5 23 L80.3 32.8 L82.8 47 L70 40.3 L57.2 47 L59.7 32.8 L49.5 23 L63.5 21 Z"
        fill={LIME}
        {...STROKE}
      />
      <path
        d="M34 74 C44 66 54 63 66 66 L80 66 C85 66 85 74 80 74 L64 74 M66 74 L86 74 L102 60 C107 56 113 62 108 67 L90 86 C88 88 85 89 82 89 L46 89"
        fill="#fff"
        {...STROKE}
      />
      <rect x="15" y="68" width="18" height="27" rx="4" transform="rotate(-35 24 81)" fill={LIME} {...STROKE} />
    </svg>
  );
}

export function TrophyIllustration({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 100" className={className} aria-hidden>
      <path d="M38 18 H20 C20 36 28 44 42 45" fill="none" {...STROKE} />
      <path d="M82 18 H100 C100 36 92 44 78 45" fill="none" {...STROKE} />
      <path d="M36 10 H84 V30 C84 46 74 56 60 56 C46 56 36 46 36 30 Z" fill={LIME} {...STROKE} />
      <path d="M60 22 L63.5 29 L71 30 L65.5 35.3 L66.8 43 L60 39.4 L53.2 43 L54.5 35.3 L49 30 L56.5 29 Z" fill="#fff" {...STROKE} strokeWidth={2.6} />
      <path d="M54 56 H66 L68 72 H52 Z" fill={LIME} {...STROKE} />
      <rect x="40" y="72" width="40" height="13" rx="4" fill="#fff" {...STROKE} />
    </svg>
  );
}

export function CalendarIllustration({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 100" className={className} aria-hidden>
      <rect x="22" y="16" width="76" height="76" rx="12" fill="#fff" {...STROKE} />
      <path d="M22 38 H98" {...STROKE} />
      <rect x="30" y="46" width="60" height="38" rx="6" fill={LIME} />
      <path d="M45 64 L56 74 L76 54" fill="none" {...STROKE} strokeWidth={4.6} />
      <rect x="38" y="7" width="9" height="18" rx="4.5" fill="#fff" {...STROKE} />
      <rect x="73" y="7" width="9" height="18" rx="4.5" fill="#fff" {...STROKE} />
    </svg>
  );
}

/** Caja de regalo negra con moño lima para el banner "Tu fidelidad tiene recompensa". */
export function GiftBoxArt({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 150" className={className} aria-hidden>
      <defs>
        <linearGradient id="bx-front" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#26262b" />
          <stop offset="1" stopColor="#0b0b0d" />
        </linearGradient>
        <linearGradient id="bx-side" x1="0" x2="1">
          <stop offset="0" stopColor="#0b0b0d" />
          <stop offset="1" stopColor="#1d1d22" />
        </linearGradient>
        <linearGradient id="bx-rib" x1="0" x2="1">
          <stop offset="0" stopColor="#e7ff3a" />
          <stop offset="1" stopColor="#b9d600" />
        </linearGradient>
      </defs>
      <ellipse cx="102" cy="140" rx="82" ry="8" fill="#0b0b0d" opacity=".12" />
      {/* frente */}
      <path d="M22 62 L112 80 L112 142 L22 124 Z" fill="url(#bx-front)" />
      {/* lateral */}
      <path d="M112 80 L182 58 L182 120 L112 142 Z" fill="url(#bx-side)" />
      {/* tapa */}
      <path d="M22 62 L92 40 L182 58 L112 80 Z" fill="#33333a" />
      {/* cinta vertical frente */}
      <path d="M62 70 L76 73 L76 135 L62 132 Z" fill="url(#bx-rib)" />
      {/* cinta lateral */}
      <path d="M142 71 L154 67 L154 129 L142 133 Z" fill="#c4e000" />
      {/* cintas en la tapa */}
      <path d="M62 70 L76 73 L146 51 L132 48 Z" fill="#dcfb07" />
      <path d="M50 53 L62 49 L154 67 L142 71 Z" fill="#cfee00" />
      {/* moño */}
      <path d="M100 58 C78 34 50 30 56 46 C60 56 84 60 100 58 Z" fill="#dcfb07" stroke="#a9c300" strokeWidth="1.5" />
      <path d="M100 58 C112 28 146 24 140 42 C136 54 114 60 100 58 Z" fill="#e9ff4d" stroke="#a9c300" strokeWidth="1.5" />
      <path d="M100 58 C96 70 88 84 80 90 L86 92 C94 82 100 72 100 58 Z" fill="#c6e400" />
      <path d="M100 58 C108 70 118 80 128 84 L124 88 C114 82 106 72 100 58 Z" fill="#c6e400" />
      <ellipse cx="100" cy="57" rx="8" ry="6" fill="#c6e400" />
      {/* logo en la caja */}
      <g transform="translate(84 98) skewY(11)">
        <text x="0" y="22" fill="#fff" fontFamily="Poppins, sans-serif" fontWeight="800" fontSize="13" letterSpacing=".5">
          SUMMA
        </text>
        <path d="M16 2 H9 a3 3 0 0 0 0 6 h3.5 a3 3 0 0 1 0 6 H5" stroke="#dcfb07" strokeWidth="3.6" fill="none" strokeLinecap="round" transform="translate(6 -4) skewX(-10)" />
      </g>
    </svg>
  );
}
