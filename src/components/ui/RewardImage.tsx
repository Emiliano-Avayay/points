import { useState } from 'react';
import { Gift } from 'lucide-react';

/** Imagen de premio con proporción fija y fallback local de marca si falla la carga. */
export function RewardImage({ src, alt, className = '', ratio = 'aspect-square', eager }: { src: string; alt: string; className?: string; ratio?: string; eager?: boolean }) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const showFallback = failed || !src;
  return (
    <div className={`relative overflow-hidden bg-surface ${ratio} ${className}`}>
      {showFallback ? (
        <div className="absolute inset-0 flex items-center justify-center bg-lime-wash" role="img" aria-label={alt}>
          <svg viewBox="0 0 100 100" className="absolute inset-0 size-full" aria-hidden>
            <circle cx="88" cy="10" r="38" fill="var(--color-lime)" opacity=".55" />
            <circle cx="8" cy="96" r="26" fill="var(--color-lime)" opacity=".4" />
          </svg>
          <span className="relative inline-flex size-14 items-center justify-center rounded-full bg-ink text-lime" aria-hidden>
            <Gift className="size-7" />
          </span>
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={`absolute inset-0 size-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        />
      )}
    </div>
  );
}
