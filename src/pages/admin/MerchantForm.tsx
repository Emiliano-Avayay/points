import { useState, type FormEvent } from 'react';
import { Check } from 'lucide-react';
import { Card } from '@/components/ui/Primitives';
import { Button } from '@/components/ui/Button';
import { Switch, TextArea, TextField } from '@/components/ui/Field';
import { MERCHANT_ICONS, MerchantMark } from '@/components/brand/MerchantMark';
import { SummaSymbol } from '@/components/brand/Logo';
import { parseIntegerInput, pointsForPurchase } from '@/domain/points';
import { validateMerchant, type MerchantInput } from '@/domain/operations';
import { fmtMoney } from '@/domain/format';
import type { MerchantIconKey } from '@/domain/types';

/** Colores secundarios sobrios: identifican al comercio sin competir con el lima de SUMMA. */
export const ACCENTS = ['#8A5A3C', '#E0752D', '#2F6F73', '#3F5BA9', '#9B3D5E', '#5B4A9E', '#2E7D4F', '#0B0B0D'];

export function MerchantForm({ initial, submitLabel, onSubmit }: { initial: MerchantInput; submitLabel: string; onSubmit: (input: MerchantInput) => string | null }) {
  const [f, setF] = useState({ ...initial, rate: String(initial.pesosPerPoint) });
  const [error, setError] = useState<string | null>(null);
  const rate = parseIntegerInput(f.rate);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (rate === null) return setError('La tasa debe ser un número entero de pesos.');
    const input: MerchantInput = { name: f.name, category: f.category, description: f.description, icon: f.icon, accent: f.accent, pesosPerPoint: rate, promotionsEnabled: f.promotionsEnabled };
    const v = validateMerchant(input);
    if (v) return setError(v);
    const err = onSubmit(input);
    setError(err);
  };

  return (
    <form onSubmit={submit} noValidate className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      <Card className="grid gap-4 p-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <TextField label="Nombre del comercio" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Ej: Librería Papiro" autoComplete="organization" />
        </div>
        <TextField label="Rubro" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} placeholder="Ej: Librería" />
        <TextField
          label="Tasa de acumulación"
          inputMode="numeric"
          prefix="$"
          suffix="= 1 pt"
          value={f.rate}
          onChange={(e) => setF({ ...f, rate: e.target.value })}
          hint={rate ? `Una compra de ${fmtMoney(10000)} suma ${pointsForPurchase(10000, rate) ?? 0} puntos.` : 'Pesos necesarios para sumar 1 punto.'}
        />
        <div className="sm:col-span-2">
          <TextArea label="Descripción" optional value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} className="min-h-20" />
        </div>
        <fieldset className="sm:col-span-2">
          <legend className="mb-2 text-sm font-semibold">Ícono</legend>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Ícono del comercio">
            {(Object.keys(MERCHANT_ICONS) as MerchantIconKey[]).map((k) => {
              const Icon = MERCHANT_ICONS[k].icon;
              const on = f.icon === k;
              return (
                <button key={k} type="button" role="radio" aria-checked={on} aria-label={MERCHANT_ICONS[k].label} onClick={() => setF({ ...f, icon: k })} className={`inline-flex size-12 items-center justify-center rounded-2xl ${on ? 'bg-ink text-lime' : 'bg-surface hover:bg-line'}`}>
                  <Icon className="size-5" aria-hidden />
                </button>
              );
            })}
          </div>
        </fieldset>
        <fieldset className="sm:col-span-2">
          <legend className="mb-2 text-sm font-semibold">Color secundario del comercio</legend>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Color secundario">
            {ACCENTS.map((c) => (
              <button key={c} type="button" role="radio" aria-checked={f.accent === c} aria-label={`Color ${c}`} onClick={() => setF({ ...f, accent: c })} className="inline-flex size-11 items-center justify-center rounded-full ring-offset-2 aria-checked:ring-[3px] aria-checked:ring-ink" style={{ backgroundColor: c }}>
                {f.accent === c && <Check className="size-5 text-white" aria-hidden />}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-[0.8rem] text-muted">Se usa en la marca del comercio. La identidad SUMMA (lima y negro) no cambia.</p>
        </fieldset>
        <div className="sm:col-span-2">
          <Switch checked={f.promotionsEnabled} onChange={(v) => setF({ ...f, promotionsEnabled: v })} label="Bonificaciones habilitadas" description="Permite aplicar promociones a las compras." />
        </div>
        {error && (
          <p className="rounded-2xl bg-danger-soft px-4 py-3 text-sm font-medium text-danger sm:col-span-2" role="alert">
            {error}
          </p>
        )}
      </Card>
      <div className="flex flex-col gap-4">
        <Card className="p-5">
          <p className="text-sm font-semibold text-muted">Vista previa</p>
          <div className="mt-3 flex items-center gap-3 rounded-2xl bg-surface p-3">
            <MerchantMark merchant={{ icon: f.icon, accent: f.accent, name: f.name }} size="lg" />
            <div className="min-w-0">
              <p className="truncate font-bold">{f.name || 'Nombre del comercio'}</p>
              <p className="truncate text-sm text-muted">{f.category || 'Rubro'}</p>
            </div>
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-muted">
            <SummaSymbol className="size-4" /> Programa de puntos impulsado por SUMMA
          </p>
        </Card>
        <Button type="submit" size="lg" full>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
