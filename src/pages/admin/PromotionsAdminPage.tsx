import { useState, type FormEvent } from 'react';
import { CalendarClock, Pencil, Percent, Plus } from 'lucide-react';
import { useAdmin } from '@/state/hooks';
import { useStore } from '@/state/StoreProvider';
import { AdminPageHeader } from '@/components/layout/AdminLayout';
import { Badge, Card, EmptyState } from '@/components/ui/Primitives';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Switch, TextArea, TextField } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { TierMedal } from '@/pages/client/LevelsPage';
import { PROMO_STATUS } from '@/pages/client/BonusesPage';
import { promotionStatus, promotionsOf } from '@/domain/selectors';
import { updateMerchant, updateTierBenefits, upsertPromotion, type PromotionInput } from '@/domain/operations';
import { parseIntegerInput } from '@/domain/points';
import { TIERS } from '@/domain/tiers';
import { fmtDate, fmtPoints } from '@/domain/format';
import type { Promotion, TierId } from '@/domain/types';

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const toDateInput = (iso: string) => iso.slice(0, 10);
const fromDateInput = (d: string, end = false) => new Date(`${d}T${end ? '23:59:00' : '00:00:00'}`).toISOString();

function PromotionModal({ editing, onClose }: { editing: Promotion | null; onClose: () => void }) {
  const { merchant } = useAdmin();
  const store = useStore();
  const toast = useToast();
  const today = new Date().toISOString().slice(0, 10);
  const inMonth = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
  const [f, setF] = useState({
    name: editing?.name ?? '',
    description: editing?.description ?? '',
    schedule: editing?.schedule ?? '',
    start: editing ? toDateInput(editing.startsAt) : today,
    end: editing ? toDateInput(editing.endsAt) : inMonth,
    bonus: editing ? String(editing.bonusPercent) : '20',
    weekdays: editing?.weekdays ?? null,
    hourFrom: editing?.hours ? String(editing.hours[0]) : '',
    hourTo: editing?.hours ? String(editing.hours[1]) : '',
    active: editing?.active ?? true,
  });
  const [error, setError] = useState<string | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const bonus = parseIntegerInput(f.bonus);
    if (bonus === null) return setError('El porcentaje debe ser un número entero.');
    let hours: [number, number] | null = null;
    if (f.hourFrom || f.hourTo) {
      const a = parseIntegerInput(f.hourFrom);
      const b = parseIntegerInput(f.hourTo);
      if (a === null || b === null || a < 0 || b > 24 || a >= b) return setError('La franja horaria debe ir de 0 a 24 y el inicio ser menor al fin.');
      hours = [a, b];
    }
    const input: PromotionInput = {
      name: f.name.trim(),
      description: f.description.trim(),
      schedule: f.schedule.trim() || (f.weekdays ? f.weekdays.map((d) => DAYS[d]).join(', ') : 'Todos los días'),
      startsAt: fromDateInput(f.start),
      endsAt: fromDateInput(f.end, true),
      bonusPercent: bonus,
      weekdays: f.weekdays && f.weekdays.length ? f.weekdays : null,
      hours,
      active: f.active,
    };
    const r = store.run((s) => upsertPromotion(s, merchant.id, input, editing?.id));
    if (!r.ok) return setError(r.error);
    toast.success(editing ? 'Promoción actualizada' : 'Promoción creada', r.value.name);
    onClose();
  };

  const toggleDay = (d: number) =>
    setF((x) => {
      const cur = x.weekdays ?? [];
      const next = cur.includes(d) ? cur.filter((v) => v !== d) : [...cur, d].sort();
      return { ...x, weekdays: next.length ? next : null };
    });

  return (
    <Modal
      open
      onClose={onClose}
      title={editing ? 'Editar promoción' : 'Nueva promoción'}
      size="lg"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="promo-form">
            Guardar
          </Button>
        </div>
      }
    >
      <form id="promo-form" onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <TextField label="Nombre" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} data-autofocus placeholder="Ej: Lunes con 20% extra" />
        </div>
        <div className="sm:col-span-2">
          <TextArea label="Descripción" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} className="min-h-20" />
        </div>
        <TextField label="Puntos extra" inputMode="numeric" suffix="%" value={f.bonus} onChange={(e) => setF({ ...f, bonus: e.target.value })} hint="100% = doble puntuación" />
        <TextField label="Texto del horario" optional value={f.schedule} onChange={(e) => setF({ ...f, schedule: e.target.value })} placeholder="Ej: Todos los lunes" />
        <TextField label="Desde" type="date" value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} />
        <TextField label="Hasta" type="date" value={f.end} onChange={(e) => setF({ ...f, end: e.target.value })} />
        <fieldset className="sm:col-span-2">
          <legend className="mb-2 text-sm font-semibold">Días en que aplica</legend>
          <div className="flex flex-wrap gap-1.5">
            {DAYS.map((d, i) => {
              const on = f.weekdays?.includes(i) ?? false;
              return (
                <button key={d} type="button" aria-pressed={on} onClick={() => toggleDay(i)} className={`h-10 min-w-12 rounded-full px-3 text-sm font-semibold ${on ? 'bg-ink text-white' : 'bg-surface hover:bg-line'}`}>
                  {d}
                </button>
              );
            })}
          </div>
          <p className="mt-1.5 text-[0.8rem] text-muted">{f.weekdays ? 'Solo los días marcados.' : 'Ningún día marcado = todos los días.'}</p>
        </fieldset>
        <TextField label="Hora desde" optional inputMode="numeric" value={f.hourFrom} onChange={(e) => setF({ ...f, hourFrom: e.target.value })} placeholder="16" suffix="h" />
        <TextField label="Hora hasta" optional inputMode="numeric" value={f.hourTo} onChange={(e) => setF({ ...f, hourTo: e.target.value })} placeholder="19" suffix="h" />
        <div className="sm:col-span-2">
          <Switch checked={f.active} onChange={(v) => setF({ ...f, active: v })} label="Promoción habilitada" />
        </div>
        {error && (
          <p className="rounded-2xl bg-danger-soft px-4 py-3 text-sm font-medium text-danger sm:col-span-2" role="alert">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
}

function TierModal({ tier, onClose }: { tier: TierId; onClose: () => void }) {
  const { merchant } = useAdmin();
  const store = useStore();
  const toast = useToast();
  const [text, setText] = useState(merchant.tierBenefits[tier].join('\n'));
  const [error, setError] = useState<string | null>(null);
  const def = TIERS.find((t) => t.id === tier)!;
  return (
    <Modal
      open
      onClose={onClose}
      title={`Beneficios nivel ${def.name}`}
      description="Un beneficio por línea. Los umbrales de puntos son fijos."
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={() => {
              const r = store.run((s) => updateTierBenefits(s, merchant.id, tier, text.split('\n')));
              if (!r.ok) return setError(r.error);
              toast.success('Beneficios actualizados', `Nivel ${def.name}`);
              onClose();
            }}
          >
            Guardar
          </Button>
        </div>
      }
    >
      <TextArea label="Beneficios" value={text} onChange={(e) => setText(e.target.value)} error={error} className="min-h-40" data-autofocus />
    </Modal>
  );
}

export function PromotionsAdminPage() {
  const { state, merchant } = useAdmin();
  const store = useStore();
  const toast = useToast();
  const [editing, setEditing] = useState<Promotion | null | 'new'>(null);
  const [tierEdit, setTierEdit] = useState<TierId | null>(null);
  const promos = promotionsOf(state, merchant.id);
  const bonusTotal = (id: string) => state.movements.filter((m) => m.promotionId === id).reduce((a, m) => a + m.points, 0);

  return (
    <>
      <AdminPageHeader
        title="Promociones y niveles"
        subtitle="Bonificaciones sobre compras y beneficios por nivel"
        actions={
          <Button onClick={() => setEditing('new')} icon={<Plus className="size-5" aria-hidden />}>
            Nueva promoción
          </Button>
        }
      />
      <Card className="mb-4 p-4">
        <Switch
          checked={merchant.promotionsEnabled}
          onChange={(v) => {
            const r = store.run((s) => updateMerchant(s, merchant.id, { ...merchant, promotionsEnabled: v }));
            if (r.ok) toast.success(v ? 'Bonificaciones activadas' : 'Bonificaciones pausadas');
          }}
          label="Bonificaciones del comercio"
          description="Si las pausás, ninguna promoción se aplica a las compras."
        />
      </Card>

      {promos.length === 0 ? (
        <EmptyState icon={<Percent className="size-7" />} title="Sin promociones" description="Creá una bonificación para incentivar visitas." />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {promos.map((p) => {
            const st = promotionStatus(p, merchant);
            return (
              <li key={p.id}>
                <Card className="flex h-full flex-col p-4">
                  <div className="flex items-start gap-3">
                    <span className={`inline-flex size-12 shrink-0 items-center justify-center rounded-2xl text-sm font-extrabold ${st === 'live' ? 'bg-lime' : 'bg-ink text-white'}`}>+{p.bonusPercent}%</span>
                    <div className="min-w-0 flex-1">
                      <h2 className="font-bold leading-snug">{p.name}</h2>
                      <Badge tone={PROMO_STATUS[st].tone} className="mt-1">
                        {PROMO_STATUS[st].label}
                      </Badge>
                    </div>
                    <button type="button" onClick={() => setEditing(p)} className="inline-flex size-10 items-center justify-center rounded-full hover:bg-surface" aria-label={`Editar ${p.name}`}>
                      <Pencil className="size-4" aria-hidden />
                    </button>
                  </div>
                  <p className="mt-2 text-sm text-ink-3">{p.description}</p>
                  <p className="mt-auto flex items-center gap-1.5 pt-3 text-xs text-muted">
                    <CalendarClock className="size-3.5" aria-hidden /> {p.schedule} · {fmtDate(p.startsAt)} – {fmtDate(p.endsAt)}
                  </p>
                  <p className="mt-1 text-xs text-muted">Bonificó {fmtPoints(bonusTotal(p.id))} pts en total</p>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <h2 className="mb-3 mt-8 text-xl font-bold">Niveles</h2>
      <ul className="grid gap-3 md:grid-cols-3">
        {TIERS.map((t) => (
          <li key={t.id}>
            <Card className="flex h-full flex-col p-4">
              <div className="flex items-center gap-3">
                <TierMedal tier={t.id} className="size-11" />
                <div className="flex-1">
                  <h3 className="font-bold">{t.name}</h3>
                  <p className="text-xs text-muted">{t.max === null ? `${fmtPoints(t.min)}+ pts` : `${fmtPoints(t.min)} – ${fmtPoints(t.max)} pts`}</p>
                </div>
                <button type="button" onClick={() => setTierEdit(t.id)} className="inline-flex size-10 items-center justify-center rounded-full hover:bg-surface" aria-label={`Editar beneficios de ${t.name}`}>
                  <Pencil className="size-4" aria-hidden />
                </button>
              </div>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-ink-3">
                {merchant.tierBenefits[t.id].map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </Card>
          </li>
        ))}
      </ul>
      {editing && <PromotionModal editing={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      {tierEdit && <TierModal tier={tierEdit} onClose={() => setTierEdit(null)} />}
    </>
  );
}
