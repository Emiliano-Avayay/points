import { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { PageContainer, PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Primitives';
import { RewardImage } from '@/components/ui/RewardImage';

interface Credit {
  slug: string;
  title: string;
  author: string;
  license: string;
  licenseUrl: string;
  sourceUrl: string;
}

/** Atribución de las fotografías (Wikimedia Commons, licencias CC0 / CC BY / CC BY-SA). */
export function CreditsPage() {
  const [credits, setCredits] = useState<Credit[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    fetch('/rewards/credits.json')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('http'))))
      .then((d: Credit[]) => setCredits(d))
      .catch(() => setFailed(true));
  }, []);
  return (
    <PageContainer className="max-w-4xl">
      <PageHeader title="Créditos de imágenes" subtitle="Fotografías de Wikimedia Commons usadas con sus licencias libres." />
      {failed && <p className="text-sm text-danger">No se pudieron cargar los créditos.</p>}
      {!credits && !failed && <p className="text-sm text-muted">Cargando…</p>}
      <ul className="grid gap-2 sm:grid-cols-2">
        {credits?.map((c) => (
          <li key={c.slug}>
            <Card className="flex items-center gap-3 p-3">
              <RewardImage src={`/rewards/${c.slug}.jpg`} alt="" className="size-14 shrink-0 rounded-xl" ratio="" />
              <div className="min-w-0 flex-1 text-sm">
                <p className="truncate font-semibold">{c.author}</p>
                <p className="truncate text-xs text-muted">{c.title}</p>
                <div className="mt-1 flex flex-wrap gap-x-3 text-xs">
                  <a className="inline-flex items-center gap-1 font-semibold underline" href={c.licenseUrl} target="_blank" rel="noreferrer noopener">
                    {c.license} <ExternalLink className="size-3" aria-hidden />
                  </a>
                  <a className="inline-flex items-center gap-1 underline" href={c.sourceUrl} target="_blank" rel="noreferrer noopener">
                    Fuente <ExternalLink className="size-3" aria-hidden />
                  </a>
                </div>
              </div>
            </Card>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-xs text-muted">Las imágenes fueron recortadas a formato cuadrado. Ilustraciones, íconos de marca y el cupón de descuento son originales de SUMMA. Íconos funcionales: Lucide (ISC).</p>
    </PageContainer>
  );
}
