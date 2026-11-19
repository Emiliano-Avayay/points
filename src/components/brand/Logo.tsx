/**
 * Marca provisional de SUMMA: símbolo geométrico en forma de S + lettering.
 * Para reemplazarla por el SVG oficial, solo hay que cambiar este archivo.
 */
interface SymbolProps {
  className?: string;
  /** lime: símbolo lima con profundidad · ink: símbolo negro (sobre fondos lima) */
  tone?: 'lime' | 'ink' | 'white';
  title?: string;
}

const S_PATH = 'M37 10 H20 a7 7 0 0 0 0 14 h8 a7 7 0 0 1 0 14 H11';

export function SummaSymbol({ className = 'size-8', tone = 'lime', title }: SymbolProps) {
  const main = tone === 'lime' ? 'var(--color-lime)' : tone === 'ink' ? 'var(--color-ink)' : '#fff';
  return (
    <svg viewBox="0 0 48 48" className={className} role={title ? 'img' : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
      <g transform="skewX(-10) translate(4 0)" fill="none" strokeLinecap="round" strokeLinejoin="round">
        {tone === 'lime' && <path d={S_PATH} stroke="var(--color-lime-deep)" strokeWidth="9" transform="translate(1.6 1.8)" />}
        <path d={S_PATH} stroke={main} strokeWidth="9" />
        {tone === 'lime' && <path d="M21 10.5 H34" stroke="#fff" strokeOpacity=".55" strokeWidth="2" />}
      </g>
    </svg>
  );
}

export function SummaLogo({ className = '', size = 'md', tone = 'ink' }: { className?: string; size?: 'sm' | 'md' | 'lg'; tone?: 'ink' | 'white' }) {
  const sym = size === 'lg' ? 'size-12' : size === 'sm' ? 'size-7' : 'size-9';
  const text = size === 'lg' ? 'text-4xl' : size === 'sm' ? 'text-xl' : 'text-[1.7rem]';
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`} aria-label="SUMMA" role="img">
      <SummaSymbol className={sym} />
      <span aria-hidden className={`${text} font-extrabold leading-none tracking-[-0.02em] ${tone === 'white' ? 'text-white' : 'text-ink'}`}>
        SUMMA
      </span>
    </span>
  );
}
