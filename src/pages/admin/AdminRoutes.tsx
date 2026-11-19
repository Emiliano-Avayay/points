import { Route, Routes } from 'react-router';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { DashboardPage } from './DashboardPage';
import { CustomersPage } from './CustomersPage';
import { CustomerDetailPage } from './CustomerDetailPage';
import { CreditPage } from './CreditPage';
import { RewardsAdminPage } from './RewardsAdminPage';
import { RedemptionsAdminPage } from './RedemptionsAdminPage';
import { MovementsAdminPage } from './MovementsAdminPage';
import { PromotionsAdminPage } from './PromotionsAdminPage';
import { CampaignsPage } from './CampaignsPage';
import { SettingsPage } from './SettingsPage';
import { NewMerchantPage } from './NewMerchantPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

export default function AdminRoutes() {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="clientes" element={<CustomersPage />} />
        <Route path="clientes/:customerId" element={<CustomerDetailPage />} />
        <Route path="acreditar" element={<CreditPage />} />
        <Route path="premios" element={<RewardsAdminPage />} />
        <Route path="canjes" element={<RedemptionsAdminPage />} />
        <Route path="movimientos" element={<MovementsAdminPage />} />
        <Route path="promociones" element={<PromotionsAdminPage />} />
        <Route path="campanas" element={<CampaignsPage />} />
        <Route path="configuracion" element={<SettingsPage />} />
        <Route path="comercios/nuevo" element={<NewMerchantPage />} />
        <Route path="*" element={<NotFoundPage inApp />} />
      </Route>
    </Routes>
  );
}
