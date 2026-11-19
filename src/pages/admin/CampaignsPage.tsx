import { useMemo, useState } from 'react';
import { BellRing, CheckCheck, Gift, Megaphone, RotateCcw, Send, Zap, type LucideIcon } from 'lucide-react';
import { useAdmin } from '@/state/hooks';
import { useStore } from '@/state/StoreProvider';
import { AdminPageHeader } from '@/components/layout/AdminLayout';
import { Badge, Card, EmptyState } from '@/components/ui/Primitives';
import { Button } from '@/components/ui/Button';
import { TextArea, TextField } from '@/components/ui/Field';
import { MerchantMark } from '@/components/brand/MerchantMark';
import { useToast } from '@/components/ui/Toast';
import { saveCampaign } from '@/domain/operations';
import { ACTIVE_WINDOW_DAYS, customerStats, customersOfMerchant, rewardsOf } from '@/domain/selectors';
import { fmtDate, fmtPoints } from '@/domain/format';
import type { CampaignType, Customer } from '@/domain/types';

const TEMPLATES: Record<CampaignType, { title: string; text: string; icon: LucideIcon; audience: string; message: string }> = {
  reactivation: {
    title: 'Reactivación de clientes',
    text: 'Volvé a traer a quienes no compran hace tiempo.',
    icon: RotateCcw,
    audience: `Sin actividad en ${ACTIVE_WINDOW_DAYS} días`,
    message: '¡Hola {nombre}! Te extrañamos en {comercio}. Tenés {puntos} puntos esperándote. Pasá esta semana y sumá puntos extra. 💚',
  },
  temporary_bonus: {
    title: 'Bonificación temporal',
    text: 'Anunciá una promo con puntos extra.',
    icon: Zap,
    audience: 'Todos los clientes',
    message: '{nombre}, ¡este finde en {comercio} tus compras suman el doble de puntos! Ya tenés {puntos} pts. ¿Te vemos?',
  },
  reward_promo: {
    title: 'Promoción de premios',
    text: 'Destacá premios del catálogo.',
    icon: Gift,
    audience: 'Todos los clientes',
    message: 'Hola {nombre} 👋 Sumamos premios nuevos en {comercio}. Con tus {puntos} puntos ya podés canjear algo rico. ¡Mirá la tienda en SUMMA!',
  },
  balance_notice: {
    title: 'Aviso de saldo disponible',
    text: 'Avisá a quienes ya pueden canjear.',
    icon: BellRing,
    audience: 'Con saldo para al menos un premio',
    message: '¡{nombre}, tenés {puntos} puntos en {comercio}! Ya te alcanzan para canjear un premio. Entrá a SUMMA y elegí el tuyo.',
  },
};

const fill = (msg: string, c: Customer | undefined, points: number, merchantName: string) =>
  msg.replace(/\{nombre\}/g, c?.name.split(' ')[0] ?? 'Cliente').replace(/\{puntos\}/g, fmtPoints(points)).replace(/\{comercio\}/g, merchantName);

export function CampaignsPage() {
  const { state, merchant } = useAdmin();
  const store = useStore();
  const toast = useToast();
  const [type, setType] = useState<CampaignType>('reactivation');
  const [name, setName] = useState(TEMPLATES.reactivation.title);
  const [message, setMessage] = useState(TEMPLATES.reactivation.message);
  const [error, setError] = useState<string | null>(null);

  const audience = useMemo(() => {
    const since = new Date(Date.now() - ACTIVE_WINDOW_DAYS * 86_400_000).toISOString();
    const minCost = Math.min(...rewardsOf(state, merchant.id).map((r) => r.cost), Infinity);
    return customersOfMerchant(state, merchant.id)
      .map((c) => ({ c, s: customerStats(state, merchant.id, c.id) }))
      .filter(({ s }) => (type === 'reactivation' ? !s.lastActivityAt || s.lastActivityAt < since : type === 'balance_notice' ? s.balance >= minCost : true));
  }, [state, merchant.id, type]);

  const sample = audience[0];
  const preview = fill(message, sample?.c, sample?.s.balance ?? 580, merchant.name);
  const history = state.campaigns.filter((c) => c.merchantId === merchant.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const now = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

  const pick = (t: CampaignType) => {
    setType(t);
    setName(TEMPLATES[t].title);
    setMessage(TEMPLATES[t].message);
    setError(null);
  };

  return (
    <>
      <AdminPageHeader title="Campañas" subtitle="Redactá mensajes para tus clientes y previsualizalos. No se envía nada real." />
      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4" role="radiogroup" aria-label="Tipo de campaña">
        {(Object.keys(TEMPLATES) as CampaignType[]).map((t) => {
          const T = TEMPLATES[t];
          const on = t === type;
          return (
            <li key={t}>
              <button
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => pick(t)}
                className={`flex h-full w-full flex-col items-start gap-2 rounded-card p-4 text-left transition-colors ${on ? 'bg-ink text-white on-dark' : 'bg-white shadow-card hover:bg-surface'}`}
              >
                <span className={`inline-flex size-10 items-center justify-center rounded-2xl ${on ? 'bg-lime text-ink' : 'bg-lime-soft'}`} aria-hidden>
                  <T.icon className="size-5" />
                </span>
                <span className="text-sm font-bold leading-snug">{T.title}</span>
                <span className={`text-xs ${on ? 'text-white/70' : 'text-muted'}`}>{T.text}</span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="flex flex-col gap-4 p-5">
          <TextField label="Nombre de la campaña" value={name} onChange={(e) => setName(e.target.value)} />
          <TextArea label="Mensaje" value={message} onChange={(e) => setMessage(e.target.value)} hint={`Variables: {nombre}, {puntos}, {comercio} · ${message.length}/700`} className="min-h-36" error={error} />
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-surface p-3 text-sm">
            <span>
              Audiencia: <strong>{TEMPLATES[type].audience}</strong>
            </span>
            <Badge tone="lime">{audience.length} clientes</Badge>
          </div>
          <Button
            icon={<Send className="size-5" aria-hidden />}
            disabled={audience.length === 0}
            onClick={() => {
              const r = store.run((s) => saveCampaign(s, merchant.id, { type, name, message, audienceSize: audience.length }));
              if (!r.ok) return setError(r.error);
              setError(null);
              toast.success('Envío simulado', `“${r.value.name}” · ${audience.length} destinatarios. No se envió ningún mensaje real.`);
            }}
          >
            Simular envío
          </Button>
          {audience.length === 0 && <p className="text-xs text-muted">No hay clientes que cumplan el criterio de esta campaña.</p>}
        </Card>

        <div>
          <p className="mb-2 text-sm font-semibold text-muted">Vista previa (estilo WhatsApp, simulada)</p>
          <div className="mx-auto max-w-sm overflow-hidden rounded-[2rem] border-[6px] border-ink bg-ink shadow-float">
            <div className="flex items-center gap-3 px-4 py-3 text-white on-dark">
              <MerchantMark merchant={merchant} size="sm" className="!rounded-full" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{merchant.name}</p>
                <p className="text-[0.7rem] text-white/60">Cuenta de empresa · vía SUMMA</p>
              </div>
            </div>
            <div className="min-h-64 bg-[#ECE5DD] px-3 py-4" style={{ backgroundImage: 'radial-gradient(rgb(11 11 13 / 0.05) 1px, transparent 1px)', backgroundSize: '14px 14px' }}>
              <p className="mx-auto mb-3 w-fit rounded-lg bg-white/80 px-2 py-0.5 text-[0.7rem] text-ink-3">HOY</p>
              <div className="relative max-w-[85%] rounded-2xl rounded-tl-sm bg-white px-3 py-2 text-[0.9rem] leading-snug shadow-sm">
                <p className="whitespace-pre-wrap break-words">{preview}</p>
                <p className="mt-1 flex items-center justify-end gap-1 text-[0.65rem] text-subtle">
                  {now} <CheckCheck className="size-3.5 text-[#34B7F1]" aria-hidden />
                </p>
              </div>
            </div>
          </div>
          {sample && <p className="mt-2 text-center text-xs text-muted">Ejemplo para {sample.c.name}</p>}
        </div>
      </div>

      <h2 className="mb-3 mt-8 text-xl font-bold">Historial</h2>
      {history.length === 0 ? (
        <EmptyState icon={<Megaphone className="size-7" />} title="Todavía no simulaste campañas" />
      ) : (
        <ul className="grid gap-2 md:grid-cols-2">
          {history.map((c) => (
            <li key={c.id}>
              <Card className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold">{c.name}</p>
                  <Badge tone="neutral">Simulada</Badge>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-ink-3">{c.message}</p>
                <p className="mt-2 text-xs text-muted">
                  {TEMPLATES[c.type].title} · {c.audienceSize} destinatarios · {fmtDate(c.createdAt)}
                </p>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
