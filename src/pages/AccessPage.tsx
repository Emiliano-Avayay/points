import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { ChevronRight, LayoutDashboard, ShieldAlert, Sparkles, UserRound } from 'lucide-react';
import { useDemoState } from '@/state/StoreProvider';
import { useSessionActions } from '@/state/hooks';
import { SummaLogo } from '@/components/brand/Logo';
import { MerchantMark } from '@/components/brand/MerchantMark';
import { Avatar, Badge, PointsPill } from '@/components/ui/Primitives';
import { ResetDemoButton } from '@/components/layout/DemoControls';
import { GiftBoxArt } from '@/components/illustrations/HomeIllustrations';
import { balanceOf, customersOfMerchant, merchantsOfCustomer } from '@/domain/selectors';
import { DEFAULT_CUSTOMER_ID } from '@/data/seed';

const FEATURED = ['c-sofia', 'c-martin', 'c-lucia', 'c-joaquin'];

export function AccessPage() {
  const state = useDemoState();
  const { viewAsCustomer, setAdminMerchant, setRole } = useSessionActions();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [showAll, setShowAll] = useState(false);
  const ref = params.get('ref');
  const inviter = ref ? state.customers.find((c) => c.referralCode === ref) : undefined;

  const customers = (showAll ? state.customers : FEATURED.map((id) => state.customers.find((c) => c.id === id)).filter((c) => !!c)).filter(
    (c) => merchantsOfCustomer(state, c.id).length > 0,
  );

  const enterAsCustomer = (customerId: string) => {
    const merchants = merchantsOfCustomer(state, customerId);
    const keep = merchants.find((m) => m.id === state.session.merchantId);
    viewAsCustomer(customerId, (keep ?? merchants[0]).id);
    navigate('/app');
  };

  const enterAsAdmin = (merchantId: string) => {
    setAdminMerchant(merchantId);
    setRole('admin');
    navigate('/admin');
  };

  return (
    <div className="relative isolate min-h-dvh overflow-hidden bg-white">
      <svg className="pointer-events-none absolute inset-0 -z-10 size-full" viewBox="0 0 400 800" preserveAspectRatio="none" aria-hidden>
        <path d="M400 0 H250 C300 50 340 110 400 190 Z" fill="var(--color-lime)" />
        <path d="M400 520 C320 600 220 660 120 800 H400 Z" fill="var(--color-lime)" />
      </svg>

      <main className="mx-auto flex max-w-5xl flex-col px-4 pb-12 pt-[max(2rem,env(safe-area-inset-top))] sm:px-6">
        <div className="flex items-center justify-between">
          <SummaLogo size="lg" />
          <Badge tone="dark" icon={<Sparkles className="size-3 text-lime" aria-hidden />}>
            Demo
          </Badge>
        </div>

        <section className="mt-8 grid items-center gap-6 md:grid-cols-[1.1fr_1fr]">
          <div className="min-w-0">
            <h1 className="text-[2.1rem] font-extrabold leading-[1.05] min-[400px]:text-4xl sm:text-5xl">
              Tu fidelidad
              <br />
              <span className="mt-2 inline-block -rotate-2 whitespace-nowrap rounded-full bg-lime px-3 py-1">tiene recompensa</span>
            </h1>
            <p className="mt-5 max-w-md text-ink-3">
              SUMMA es una plataforma de fidelización para comercios: cada negocio tiene su propio programa de puntos, premios y bonificaciones.
            </p>
          </div>
          <GiftBoxArt className="mx-auto hidden w-full max-w-sm drop-shadow-2xl md:block" />
        </section>

        {inviter && (
          <p className="mt-6 rounded-2xl border-2 border-ink bg-lime-wash p-4 text-sm" role="status">
            <strong>{inviter.name}</strong> te invitó a SUMMA con el código <span className="font-mono font-bold">{ref}</span>. En esta demo el registro se simula desde la pantalla “Invitá amigos”.
          </p>
        )}

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <section aria-labelledby="como-cliente" className="min-w-0 rounded-card bg-white p-5 shadow-card ring-1 ring-line">
            <div className="flex items-center gap-3">
              <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-lime" aria-hidden>
                <UserRound className="size-6" />
              </span>
              <div>
                <h2 id="como-cliente" className="text-xl font-bold">
                  Entrar como cliente
                </h2>
                <p className="text-sm text-muted">Elegí una persona ficticia</p>
              </div>
            </div>
            <ul className="mt-4 flex flex-col gap-2">
              {customers.map((c) => {
                const ms = merchantsOfCustomer(state, c.id);
                const main = ms[0];
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => enterAsCustomer(c.id)}
                      className="flex w-full items-center gap-3 rounded-2xl border border-line p-3 text-left transition-colors hover:border-ink hover:bg-lime-wash"
                    >
                      <Avatar name={c.name} tone={c.id === DEFAULT_CUSTOMER_ID ? 'lime' : 'soft'} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{c.name}</span>
                        <span className="line-clamp-2 block text-[0.8rem] leading-snug text-muted">
                          {ms.map((m) => m.name).join(' · ')}
                        </span>
                      </span>
                      {main && (
                        <span className="hidden min-[480px]:inline">
                          <PointsPill points={balanceOf(state, main.id, c.id)} size="sm" label={`${balanceOf(state, main.id, c.id)} puntos en ${main.name}`} />
                        </span>
                      )}
                      <ChevronRight className="size-5 shrink-0 text-subtle" aria-hidden />
                    </button>
                  </li>
                );
              })}
            </ul>
            <button type="button" onClick={() => setShowAll((v) => !v)} className="mt-3 min-h-11 w-full rounded-full text-sm font-semibold hover:bg-surface" aria-expanded={showAll}>
              {showAll ? 'Ver menos' : `Ver los ${state.customers.length} clientes`}
            </button>
          </section>

          <section aria-labelledby="como-admin" className="min-w-0 rounded-card bg-ink p-5 text-white on-dark">
            <div className="flex items-center gap-3">
              <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-lime text-ink" aria-hidden>
                <LayoutDashboard className="size-6" />
              </span>
              <div>
                <h2 id="como-admin" className="text-xl font-bold">
                  Entrar como administrador
                </h2>
                <p className="text-sm text-white/70">Gestioná un comercio</p>
              </div>
            </div>
            <ul className="mt-4 flex flex-col gap-2">
              {state.merchants.map((m) => (
                <li key={m.id}>
                  <button type="button" onClick={() => enterAsAdmin(m.id)} className="flex w-full items-center gap-3 rounded-2xl bg-white/8 p-3 text-left ring-1 ring-white/10 transition-colors hover:bg-white/15">
                    <MerchantMark merchant={m} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{m.name}</span>
                      <span className="block truncate text-[0.8rem] text-white/65">
                        {m.category} · {customersOfMerchant(state, m.id).length} clientes
                      </span>
                    </span>
                    <ChevronRight className="size-5 shrink-0 text-white/50" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="mt-6 flex flex-col items-start gap-4 rounded-card bg-surface p-5 sm:flex-row sm:items-center">
          <ShieldAlert className="size-6 shrink-0" aria-hidden />
          <p className="flex-1 text-sm text-ink-3">
            <strong className="text-ink">Acceso de demostración.</strong> No hay contraseñas ni autenticación real: los datos son ficticios y se guardan solo en este navegador (LocalStorage).
          </p>
          <ResetDemoButton />
        </div>
      </main>
    </div>
  );
}
