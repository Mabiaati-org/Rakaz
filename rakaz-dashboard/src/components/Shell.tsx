import { NavLink, Outlet } from 'react-router-dom';

import { useAuth } from '@/auth/AuthContext';

const links = [
  { to: '/', label: 'نظرة عامة', end: true },
  { to: '/trips', label: 'الرحلات الحية' },
  { to: '/students', label: 'الطلاب' },
  { to: '/guardians', label: 'أولياء الأمور' },
  { to: '/drivers', label: 'السائقون' },
  { to: '/routes', label: 'المسارات' },
  { to: '/schools', label: 'المدارس' },
  { to: '/absences', label: 'الغياب' },
  { to: '/finance', label: 'المالية' },
  { to: '/tickets', label: 'الدعم' },
  { to: '/settings', label: 'الإعدادات' },
];

export function Shell() {
  const { user, logout } = useAuth();
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <strong>ركاز</strong>
          <span>لوحة الإدارة</span>
        </div>
        <nav className="nav">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end} className={({ isActive }) => (isActive ? 'active' : undefined)}>
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="account-pill">
          <NavLink to="/account">{user?.name}</NavLink>
          <button type="button" onClick={() => void logout()}>
            تسجيل الخروج
          </button>
        </div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
