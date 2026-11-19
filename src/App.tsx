import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { ScrollToTop } from './components/layout/ScrollToTop';
import { ClientLayout } from './components/layout/ClientLayout';
import { AccessPage } from './pages/AccessPage';
import { HomePage } from './pages/client/HomePage';
import { StorePage } from './pages/client/StorePage';
import { RewardDetailPage } from './pages/client/RewardDetailPage';
import { PointsPage } from './pages/client/PointsPage';
import { RedemptionsPage } from './pages/client/RedemptionsPage';
import { FavoritesPage } from './pages/client/FavoritesPage';
import { InvitePage } from './pages/client/InvitePage';
import { BonusesPage } from './pages/client/BonusesPage';
import { ChallengesPage } from './pages/client/ChallengesPage';
import { LevelsPage } from './pages/client/LevelsPage';
import { EngagementsPage } from './pages/client/EngagementsPage';
import { ProfilePage } from './pages/client/ProfilePage';
import { EarnPage } from './pages/client/EarnPage';
import { MerchantsPage } from './pages/client/MerchantsPage';
import { CreditsPage } from './pages/client/CreditsPage';
import { NotFoundPage } from './pages/NotFoundPage';

// El panel admin (con gráficos) se carga bajo demanda para aligerar la vista cliente.
const AdminRoutes = lazy(() => import('./pages/admin/AdminRoutes'));

function Loading() {
  return (
    <div className="flex min-h-dvh items-center justify-center" role="status">
      <span className="size-10 animate-spin rounded-full border-4 border-lime border-t-ink" aria-hidden />
      <span className="sr-only">Cargando…</span>
    </div>
  );
}

export function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<AccessPage />} />
        <Route path="/app" element={<ClientLayout />}>
          <Route index element={<HomePage />} />
          <Route path="premios" element={<StorePage />} />
          <Route path="premios/:rewardId" element={<RewardDetailPage />} />
          <Route path="puntos" element={<PointsPage />} />
          <Route path="canjes" element={<RedemptionsPage />} />
          <Route path="favoritos" element={<FavoritesPage />} />
          <Route path="invitar" element={<InvitePage />} />
          <Route path="bonificaciones" element={<BonusesPage />} />
          <Route path="desafios" element={<ChallengesPage />} />
          <Route path="niveles" element={<LevelsPage />} />
          <Route path="eventos" element={<EngagementsPage />} />
          <Route path="perfil" element={<ProfilePage />} />
          <Route path="sumar" element={<EarnPage />} />
          <Route path="comercios" element={<MerchantsPage />} />
          <Route path="creditos" element={<CreditsPage />} />
          <Route path="*" element={<NotFoundPage inApp />} />
        </Route>
        <Route
          path="/admin/*"
          element={
            <Suspense fallback={<Loading />}>
              <AdminRoutes />
            </Suspense>
          }
        />
        <Route path="/inicio" element={<Navigate to="/app" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}
