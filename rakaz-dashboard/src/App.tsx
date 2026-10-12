import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { AuthProvider, useAuth } from '@/auth/AuthContext';
import { Shell } from '@/components/Shell';
import { AbsencesPage } from '@/pages/Absences';
import { AccountPage } from '@/pages/Account';
import { AlertsPage } from '@/pages/Alerts';
import { DriversPage } from '@/pages/Drivers';
import { FinancePage } from '@/pages/Finance';
import { GuardiansPage } from '@/pages/Guardians';
import { LiveTripsPage } from '@/pages/LiveTrips';
import { LoginPage } from '@/pages/Login';
import { OverviewPage } from '@/pages/Overview';
import { RoutesPage } from '@/pages/Routes';
import { SchoolsPage } from '@/pages/Schools';
import { SettingsPage } from '@/pages/Settings';
import { StudentsPage } from '@/pages/Students';
import { TicketsPage } from '@/pages/Tickets';

function AppRoutes() {
  const { user } = useAuth();
  if (user === undefined) return <div className="splash">جارٍ التحميل…</div>;
  if (user === null) return <LoginPage />;
  // An admin with a temporary password can do nothing else until it is replaced.
  if (user.mustChangePassword) return <AccountPage forced />;

  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<OverviewPage />} />
        <Route path="alerts" element={<AlertsPage />} />
        <Route path="trips" element={<LiveTripsPage />} />
        <Route path="students" element={<StudentsPage />} />
        <Route path="guardians" element={<GuardiansPage />} />
        <Route path="drivers" element={<DriversPage />} />
        <Route path="routes" element={<RoutesPage />} />
        <Route path="schools" element={<SchoolsPage />} />
        <Route path="absences" element={<AbsencesPage />} />
        <Route path="finance" element={<FinancePage />} />
        <Route path="tickets" element={<TicketsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="account" element={<AccountPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
