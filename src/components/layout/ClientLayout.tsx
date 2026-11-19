import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import {
  CalendarDays,
  ChartNoAxesColumnIncreasing,
  ChevronRight,
  Gift,
  Heart,
  House,
  Image,
  LayoutDashboard,
  Menu,
  Percent,
  Repeat,
  ShoppingBag,
  Sparkles,
  Store,
  Trophy,
  UserPlus,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { SummaLogo, SummaSymbol } from '@/components/brand/Logo';
import { MerchantMark } from '@/components/brand/MerchantMark';
import { Avatar, Badge, PointsPill } from '@/components/ui/Primitives';
import { IconButton } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { MerchantSwitcher } from './MerchantSwitcher';
import { ResetDemoButton } from './DemoControls';
import { useClient, useSessionActions } from '@/state/hooks';
import { tierFor } from '@/domain/tiers';
import { fmtPoints } from '@/domain/format';

const MENU: { to: string; label: string; icon: LucideIcon }[] = [
  { to: '/app', label: 'Inicio', icon: House },
  { to: '/app/premios', label: 'Tienda de premios', icon: ShoppingBag },
  { to: '/app/sumar', label: 'Sumá puntos', icon: Sparkles },
  { to: '/app/puntos', label: 'Mis puntos', icon: ChartNoAxesColumnIncreasing },
  { to: '/app/canjes', label: 'Mis canjes', icon: Gift },
  { to: '/app/favoritos', label: 'Favoritos', icon: Heart },
  { to: '/app/bonificaciones', label: 'Bonificaciones', icon: Percent },
  { to: '/app/desafios', label: 'Desafíos Summa', icon: Trophy },
  { to: '/app/niveles', label: 'Niveles', icon: Sparkles },
  { to: '/app/eventos', label: 'Eventos, encuestas y sorteos', icon: CalendarDays },
  { to: '/app/invitar', label: 'Invitá amigos', icon: UserPlus },
  { to: '/app/comercios', label: 'Comercios adheridos', icon: Store },
  { to: '/app/perfil', label: 'Mi perfil', icon: UserRound },
  { to: '/app/creditos', label: 'Créditos de imágenes', icon: Image },
];

export function ClientLayout() {
  const { state, customer, merchant, stats } = useClient();
  const { setRole } = useSessionActions();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);

  useEffect(() => {
    if (state.session.role !== 'customer') setRole('customer');
  }, [state.session.role, setRole]);

  useEffect(() => setMenuOpen(false), [location.pathname]);

  const tier = tierFor(stats.totalEarned);

  return (
    <div className="min-h-dvh bg-canvas">
      <a href="#contenido" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[90] focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-white">
        Saltar al contenido
      </a>
      <header className="sticky top-0 z-40 border-b border-line/70 bg-white/95 pt-safe backdrop-blur supports-[backdrop-filter]:bg-white/85">
        <div className="mx-auto grid h-16 max-w-6xl grid-cols-[auto_1fr_auto] items-center gap-2 px-3 sm:px-6">
          <IconButton label="Abrir menú" onClick={() => setMenuOpen(true)} aria-haspopup="dialog">
            <Menu className="size-7" strokeWidth={2.6} aria-hidden />
          </IconButton>
          <Link to="/app" className="justify-self-center rounded-xl" aria-label="SUMMA, ir al inicio">
            <span className="min-[360px]:hidden">
              <SummaLogo size="sm" />
            </span>
            <span className="hidden min-[360px]:inline">
              <SummaLogo />
            </span>
          </Link>
          <Link to="/app/puntos" className="rounded-full" aria-label={`Tenés ${fmtPoints(stats.balance)} puntos en ${merchant.name}. Ver mis puntos`}>
            <PointsPill points={stats.balance} className="shadow-lime" label="" />
          </Link>
        </div>
      </header>

      <main id="contenido" className="pb-nav">
        <Outlet />
      </main>

      <BottomNav />

      <Modal open={menuOpen} onClose={() => setMenuOpen(false)} title="Menú" variant="side" hideTitle>
        <div className="-mt-2 flex flex-col gap-5">
          <SummaLogo size="sm" />
          <div className="rounded-card bg-ink p-4 text-white on-dark">
            <div className="flex items-center gap-3">
              <Avatar name={customer.name} />
              <div className="min-w-0">
                <p className="truncate font-semibold">{customer.name}</p>
                <p className="text-sm text-white/70">Nivel {tier.name}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setSwitcherOpen(true);
              }}
              className="mt-4 flex w-full items-center gap-3 rounded-2xl bg-white/10 p-2.5 text-left hover:bg-white/15"
            >
              <MerchantMark merchant={merchant} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block text-xs text-white/65">Comercio activo</span>
                <span className="block truncate text-sm font-semibold">{merchant.name}</span>
              </span>
              <Repeat className="size-4 text-lime" aria-hidden />
              <span className="sr-only">Cambiar de comercio</span>
            </button>
          </div>
          <nav aria-label="Secciones">
            <ul className="flex flex-col">
              {MENU.map(({ to, label, icon: Icon }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    end={to === '/app'}
                    className={({ isActive }) =>
                      `flex min-h-12 items-center gap-3 rounded-2xl px-3 text-[0.95rem] font-medium transition-colors ${isActive ? 'bg-lime font-semibold' : 'hover:bg-surface'}`
                    }
                  >
                    <Icon className="size-5" aria-hidden />
                    <span className="flex-1">{label}</span>
                    <ChevronRight className="size-4 text-subtle" aria-hidden />
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <div className="rounded-card border border-line p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold">Modo demostración</p>
              <Badge tone="lime">Demo</Badge>
            </div>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setRole('admin');
                  navigate('/admin');
                }}
                className="flex min-h-12 items-center gap-3 rounded-2xl bg-surface px-3 text-sm font-semibold hover:bg-line"
              >
                <LayoutDashboard className="size-5" aria-hidden /> Cambiar a administrador
              </button>
              <button type="button" onClick={() => navigate('/')} className="flex min-h-12 items-center gap-3 rounded-2xl bg-surface px-3 text-sm font-semibold hover:bg-line">
                <Users className="size-5" aria-hidden /> Elegir otro cliente
              </button>
              <ResetDemoButton variant="ghost" full onDone={() => setMenuOpen(false)} />
            </div>
          </div>
        </div>
      </Modal>
      <MerchantSwitcher open={switcherOpen} onClose={() => setSwitcherOpen(false)} />
    </div>
  );
}

function BottomNav() {
  const items: { to: string; label: string; icon: LucideIcon; end?: boolean }[] = [
    { to: '/app', label: 'Inicio', icon: House, end: true },
    { to: '/app/canjes', label: 'Mis canjes', icon: Gift },
  ];
  const right: typeof items = [
    { to: '/app/puntos', label: 'Mis puntos', icon: ChartNoAxesColumnIncreasing },
    { to: '/app/favoritos', label: 'Favoritos', icon: Heart },
  ];
  const renderItem = ({ to, label, icon: Icon, end }: (typeof items)[number]) => (
    <li key={to} className="flex-1">
      <NavLink to={to} end={end} className="group flex h-16 flex-col items-center justify-center gap-0.5 rounded-2xl">
        {({ isActive }) => (
          <>
            <Icon className={`size-6 transition-colors ${isActive ? 'fill-lime text-ink' : 'text-ink-3'}`} strokeWidth={isActive ? 2.4 : 2} aria-hidden />
            <span className={`whitespace-nowrap text-[0.66rem] leading-tight min-[380px]:text-xs ${isActive ? 'font-bold text-ink' : 'font-medium text-ink-3'}`}>{label}</span>
            <span aria-hidden className={`mt-0.5 h-1 w-8 rounded-full transition-colors ${isActive ? 'bg-lime' : 'bg-transparent'}`} />
          </>
        )}
      </NavLink>
    </li>
  );
  return (
    <nav aria-label="Navegación principal" className="fixed inset-x-0 bottom-0 z-40 md:bottom-4 md:px-4">
      <div className="relative mx-auto max-w-xl rounded-t-[1.75rem] bg-white pb-safe shadow-[0_-8px_30px_-12px_rgb(11_11_13/0.18)] md:rounded-[1.75rem] md:pb-0 md:shadow-float">
        <ul className="flex items-stretch px-1 pt-1 min-[380px]:px-1.5">
          {items.map(renderItem)}
          <li className="flex w-16 shrink-0 justify-center min-[380px]:w-20">
            <NavLink
              to="/app/premios"
              aria-label="Tienda de premios"
              className={({ isActive }) =>
                `-mt-8 flex size-[4.5rem] items-center justify-center rounded-full border-[5px] border-white bg-lime shadow-lime transition-transform duration-200 hover:scale-105 active:scale-95 ${isActive ? 'ring-2 ring-ink' : ''}`
              }
            >
              <SummaSymbol tone="ink" className="size-10" />
            </NavLink>
          </li>
          {right.map(renderItem)}
        </ul>
      </div>
    </nav>
  );
}
