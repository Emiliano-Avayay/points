import { useMemo, useRef, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { CircleCheck, Minus, Plus, Receipt, SlidersHorizontal, Smartphone, Star, Zap } from 'lucide-react';
import { useAdmin, useSessionActions } from '@/state/hooks';
import { useStore } from '@/state/StoreProvider';
import { AdminPageHeader } from '@/components/layout/AdminLayout';
import { Avatar, Card, EmptyState, PointsPill } from '@/components/ui/Primitives';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Segmented } from '@/components/ui/Chips';
import { SelectField, TextField } from '@/components/ui/Field';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { adjustPoints, creditManual, creditPurchase } from '@/domain/operations';
import { balanceOf, bestActivePromotion, customersOfMerchant, getCustomer } from '@/domain/selectors';
import { MAX_POINTS_PER_OPERATION, parseAmountInput, parseIntegerInput, pointsForPurchase, promoBonus } from '@/domain/points';
import { fmtMoney, fmtPoints } from '@/domain/format';
import { uid } from '@/domain/ids';

type Mode = 'purchase' | 'manual' | 'adjust';

interface Done {
  customerId: string;
  title: string;
  detail: string;
  balance: number;
}

export function CreditPage() {
  const { state, merchant } = useAdmin();
  const { viewAsCustomer } = useSessionActions();
  const store = useStore();
  const toast = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const customers = useMemo(() => customersOfMerchant(state, merchant.id).sort((a, b) => a.name.localeCompare(b.name, 'es')), [state, merchant.id]);
  const initialCustomer = customers.some((c) => c.id === params.get('cliente')) ? params.get('cliente')! : '';

  const [customerId, setCustomerId] = useState(initialCustomer);
  const [mode, setMode] = useState<Mode>(params.get('modo') === 'ajuste' ? 'adjust' : 'purchase');
  const [amountRaw, setAmountRaw] = useState('');
  const [pointsRaw, setPointsRaw] = useState('');
  const [direction, setDirection] = useState<'add' | 'sub'>('add');
  const [reason, setReason] = useState('');
  const [applyPromo, setApplyPromo] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [done, setDone] = useState<Done | null>(null);
  const requestId = useRef('');
  const inFlight = useRef(false);

  const customer = customerId ? getCustomer(state, customerId) : undefined;
  const balance = customer ? balanceOf(state, merchant.id, customer.id) : 0;
  const promo = bestActivePromotion(state, merchant.id);

  const amount = parseAmountInput(amountRaw);
  const basePoints = amount === null ? null : pointsForPurchase(amount, merchant.pesosPerPoint);
  const bonus = basePoints && promo && applyPromo ? promoBonus(basePoints, promo.bonusPercent) : 0;
  const points = parseIntegerInput(pointsRaw);

  const preview = mode === 'purchase' ? (basePoints ?? 0) + bonus : mode === 'manual' ? (points ?? 0) : direction === 'add' ? (points ?? 0) : -(points ?? 0);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!customer) e.customer = 'Seleccioná un cliente.';
    if (mode === 'purchase') {
      if (amount === null) e.amount = 'Ingresá un monto válido, sin signos negativos.';
      else if (!basePoints) e.amount = `El monto mínimo para sumar 1 punto es ${fmtMoney(merchant.pesosPerPoint)}.`;
    } else {
      if (points === null || points <= 0) e.points = 'Ingresá una cantidad entera mayor a cero.';
      else if (points > MAX_POINTS_PER_OPERATION) e.points = 'La cantidad supera el máximo por operación.';
      else if (mode === 'adjust' && direction === 'sub' && points > balance) e.points = `No podés descontar más que el saldo (${fmtPoints(balance)} pts).`;
      if (mode === 'manual' && !reason.trim()) e.reason = 'Indicá el motivo de la acreditación.';
      if (mode === 'adjust' && reason.trim().length < 3) e.reason = 'Todo ajuste necesita una justificación.';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = (ev: FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    requestId.current = uid('req');
    setConfirmOpen(true);
  };

  const confirm = () => {
    if (inFlight.current || !customer) return;
    inFlight.current = true;
    const base = { merchantId: merchant.id, customerId: customer.id, requestId: requestId.current };
    let result: Done | null = null;
    let error: string | null = null;
    if (mode === 'purchase') {
      const r = store.run((s) => creditPurchase(s, { ...base, amount: amount!, reason, applyPromotion: applyPromo }));
      if (r.ok) {
        const total = r.value.points + r.value.bonus;
        result = {
          customerId: customer.id,
          title: `+${fmtPoints(total)} puntos acreditados`,
          detail: `Compra de ${fmtMoney(amount!)} → ${fmtPoints(r.value.points)} pts${r.value.bonus ? ` + ${fmtPoints(r.value.bonus)} pts de “${r.value.promotion?.name}”` : ''}.`,
          balance: balanceOf(r.state, merchant.id, customer.id),
        };
      } else error = r.error;
    } else if (mode === 'manual') {
      const r = store.run((s) => creditManual(s, { ...base, points: points!, reason }));
      if (r.ok) result = { customerId: customer.id, title: `+${fmtPoints(points!)} puntos acreditados`, detail: reason.trim(), balance: balanceOf(r.state, merchant.id, customer.id) };
      else error = r.error;
    } else {
      const delta = direction === 'add' ? points! : -points!;
      const r = store.run((s) => adjustPoints(s, { ...base, delta, reason }));
      if (r.ok) result = { customerId: customer.id, title: `Ajuste de ${delta > 0 ? '+' : '−'}${fmtPoints(Math.abs(delta))} puntos`, detail: reason.trim(), balance: r.value.balance };
      else error = r.error;
    }
    inFlight.current = false;
    setConfirmOpen(false);
    if (error) {
      toast.error('No se pudo registrar', error);
      return;
    }
    setDone(result);
    toast.success(result!.title, `${customer.name} · nuevo saldo ${fmtPoints(result!.balance)} pts`);
  };

  const reset = () => {
    setDone(null);
    setAmountRaw('');
    setPointsRaw('');
    setReason('');
    setErrors({});
  };

  if (customers.length === 0) {
    return (
      <>
        <AdminPageHeader title="Acreditar puntos" />
        <EmptyState icon={<Star className="size-7" />} title="No hay clientes en este comercio" description="Cuando haya clientes adheridos vas a poder acreditarles puntos." />
      </>
    );
  }

  if (done) {
    const c = getCustomer(state, done.customerId)!;
    return (
      <>
        <AdminPageHeader title="Acreditar puntos" />
        <Card className="mx-auto max-w-lg p-6 text-center" role="status">
          <span className="mx-auto mb-4 inline-flex size-20 items-center justify-center rounded-full bg-lime animate-pop" aria-hidden>
            <CircleCheck className="size-10" />
          </span>
          <h2 className="text-2xl font-extrabold">{done.title}</h2>
          <p className="mt-1 text-ink-3">{done.detail}</p>
          <div className="mt-5 flex items-center justify-center gap-3 rounded-2xl bg-surface p-4">
            <Avatar name={c.name} tone="soft" />
            <div className="text-left">
              <p className="font-semibold">{c.name}</p>
              <p className="text-sm text-muted">Nuevo saldo en {merchant.name}</p>
            </div>
            <PointsPill points={done.balance} className="ml-auto" />
          </div>
          <p className="mt-3 text-xs text-muted">El movimiento quedó registrado en el historial del cliente.</p>
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <Button onClick={reset}>Nueva operación</Button>
            <Button
              variant="dark"
              icon={<Smartphone className="size-5" aria-hidden />}
              onClick={() => {
                viewAsCustomer(c.id, merchant.id);
                navigate('/app/puntos');
              }}
            >
              Ver como cliente
            </Button>
            <ButtonLink to={`/admin/clientes/${c.id}`} variant="secondary" className="sm:col-span-2">
              Ver ficha del cliente
            </ButtonLink>
          </div>
        </Card>
      </>
    );
  }

  return (
    <>
      <AdminPageHeader title="Acreditar puntos" subtitle={`${merchant.name} · 1 punto cada ${fmtMoney(merchant.pesosPerPoint)}`} />
      <form onSubmit={submit} noValidate className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Card className="flex flex-col gap-5 p-5">
          <SelectField label="Cliente" value={customerId} onChange={(e) => setCustomerId(e.target.value)} error={errors.customer}>
            <option value="">Seleccioná un cliente…</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {fmtPoints(balanceOf(state, merchant.id, c.id))} pts
              </option>
            ))}
          </SelectField>

          <div>
            <p className="mb-2 text-sm font-semibold" id="modo-label">
              Tipo de operación
            </p>
            <Segmented
              label="Tipo de operación"
              value={mode}
              onChange={(m) => {
                setMode(m);
                setErrors({});
              }}
              options={[
                { value: 'purchase', label: 'Compra', icon: <Receipt className="size-4" aria-hidden /> },
                { value: 'manual', label: 'Manual', icon: <Plus className="size-4" aria-hidden /> },
                { value: 'adjust', label: 'Ajuste', icon: <SlidersHorizontal className="size-4" aria-hidden /> },
              ]}
            />
          </div>

          {mode === 'purchase' && (
            <>
              <TextField
                label="Monto de la compra"
                inputMode="decimal"
                prefix="$"
                placeholder="0"
                value={amountRaw}
                onChange={(e) => setAmountRaw(e.target.value)}
                error={errors.amount}
                hint={`Se calcula floor(monto ÷ ${merchant.pesosPerPoint}). Sin fracciones de punto.`}
                autoComplete="off"
              />
              {promo && (
                <label className="flex items-start gap-3 rounded-2xl border-2 border-ink bg-lime-wash p-3">
                  <input type="checkbox" checked={applyPromo} onChange={(e) => setApplyPromo(e.target.checked)} className="mt-1 size-5 accent-ink" />
                  <span className="text-sm">
                    <span className="flex items-center gap-1 font-semibold">
                      <Zap className="size-4 fill-ink" aria-hidden /> Aplicar “{promo.name}” (+{promo.bonusPercent}%)
                    </span>
                    <span className="text-ink-3">Bonificación vigente ahora. Se aplica una sola vez por compra.</span>
                  </span>
                </label>
              )}
              <TextField label="Detalle" optional placeholder="Compra en el local" value={reason} onChange={(e) => setReason(e.target.value)} />
            </>
          )}

          {mode === 'manual' && (
            <>
              <TextField label="Puntos a acreditar" inputMode="numeric" placeholder="0" value={pointsRaw} onChange={(e) => setPointsRaw(e.target.value)} error={errors.points} suffix="pts" autoComplete="off" />
              <TextField label="Motivo" placeholder="Ej: regalo de cumpleaños" value={reason} onChange={(e) => setReason(e.target.value)} error={errors.reason} />
            </>
          )}

          {mode === 'adjust' && (
            <>
              <Segmented
                label="Sentido del ajuste"
                value={direction}
                onChange={setDirection}
                options={[
                  { value: 'add', label: 'Sumar', icon: <Plus className="size-4" aria-hidden /> },
                  { value: 'sub', label: 'Descontar', icon: <Minus className="size-4" aria-hidden /> },
                ]}
              />
              <TextField label="Cantidad de puntos" inputMode="numeric" placeholder="0" value={pointsRaw} onChange={(e) => setPointsRaw(e.target.value)} error={errors.points} suffix="pts" autoComplete="off" />
              <TextField label="Justificación" placeholder="Ej: corrección de compra duplicada" value={reason} onChange={(e) => setReason(e.target.value)} error={errors.reason} />
            </>
          )}
        </Card>

        <div className="flex flex-col gap-4">
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-muted">Resumen</h2>
            {customer ? (
              <div className="mt-3 flex items-center gap-3">
                <Avatar name={customer.name} tone="soft" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{customer.name}</p>
                  <p className="text-sm text-muted">Saldo actual: {fmtPoints(balance)} pts</p>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted">Elegí un cliente para ver el resumen.</p>
            )}
            <dl className="mt-4 space-y-2 text-sm">
              {mode === 'purchase' && (
                <>
                  <div className="flex justify-between">
                    <dt className="text-muted">Puntos por compra</dt>
                    <dd className="font-semibold tabular">{basePoints === null ? '—' : fmtPoints(basePoints)}</dd>
                  </div>
                  {promo && applyPromo && (
                    <div className="flex justify-between">
                      <dt className="text-muted">Bonificación +{promo.bonusPercent}%</dt>
                      <dd className="font-semibold tabular text-success">+{fmtPoints(bonus)}</dd>
                    </div>
                  )}
                </>
              )}
              <div className="flex items-center justify-between rounded-2xl bg-lime px-4 py-3">
                <dt className="font-semibold">{preview < 0 ? 'Se descuentan' : 'Se acreditan'}</dt>
                <dd className="text-xl font-extrabold tabular">{fmtPoints(Math.abs(preview))} pts</dd>
              </div>
              {customer && (
                <div className="flex justify-between pt-1">
                  <dt className="text-muted">Saldo resultante</dt>
                  <dd className={`font-bold tabular ${balance + preview < 0 ? 'text-danger' : ''}`}>{fmtPoints(balance + preview)} pts</dd>
                </div>
              )}
            </dl>
          </Card>
          <Button type="submit" size="lg" full>
            {mode === 'adjust' ? 'Registrar ajuste' : 'Acreditar puntos'}
          </Button>
        </div>
      </form>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Confirmá la operación"
        description="Se registrará un movimiento en el historial del cliente."
        confirmLabel="Confirmar"
        tone={preview < 0 ? 'danger' : 'primary'}
        onConfirm={confirm}
      >
        {customer && (
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Cliente</dt>
              <dd className="font-semibold">{customer.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Operación</dt>
              <dd className="font-semibold">{mode === 'purchase' ? `Compra de ${fmtMoney(amount ?? 0)}` : mode === 'manual' ? 'Acreditación manual' : 'Ajuste administrativo'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Puntos</dt>
              <dd className="font-bold tabular">
                {preview > 0 ? '+' : '−'}
                {fmtPoints(Math.abs(preview))}
              </dd>
            </div>
            <div className="flex justify-between border-t border-line pt-2">
              <dt className="font-semibold">Saldo final</dt>
              <dd className="font-extrabold tabular">{fmtPoints(balance + preview)} pts</dd>
            </div>
          </dl>
        )}
      </ConfirmDialog>
    </>
  );
}
