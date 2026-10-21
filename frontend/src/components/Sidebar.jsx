import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';

const menus = {
  patient: [
    { to: '/patient/dashboard', key: 'dashboard', icon: '🏠' },
    { to: '/patient/profile', key: 'profile', icon: '👤' },
    { to: '/patient/medicines', key: 'medicines', icon: '💊' },
    { to: '/patient/reports', key: 'reports', icon: '📄' },
    { to: '/patient/health-change', key: 'old_vs_new', icon: '📊' },
    { to: '/patient/doctor-connect', key: 'doctor_connect', icon: '🔗' },
    { to: '/patient/care-circle', key: 'care_circle', icon: '👨‍👩‍👧' },
    { to: '/patient/recovery-track', key: 'recovery_track', icon: '💪' },
    { to: '/patient/notifications', key: 'notifications', icon: '🔔' },
    { to: '/patient/settings', key: 'settings', icon: '⚙️' }
  ],
  doctor: [
    { to: '/doctor/dashboard', key: 'dashboard', icon: '🏠' },
    { to: '/doctor/patients', key: 'patients', icon: '👥' },
    { to: '/doctor/reports', key: 'reports', icon: '📄' },
    { to: '/doctor/health-change', key: 'old_vs_new', icon: '📊' },
    { to: '/doctor/care-plans', key: 'care_plans', icon: '📋' },
    { to: '/doctor/follow-ups', key: 'follow_ups', icon: '✅' },
    { to: '/doctor/qr-access', key: 'qr_access', icon: '📷' },
    { to: '/doctor/notifications', key: 'notifications', icon: '🔔' },
    { to: '/doctor/settings', key: 'settings', icon: '⚙️' }
  ],
  caregiver: [
    { to: '/caregiver/dashboard', key: 'dashboard', icon: '🏠' },
    { to: '/caregiver/patients', key: 'patients', icon: '👥' },
    { to: '/caregiver/medicines', key: 'medicines', icon: '💊' },
    { to: '/caregiver/reports', key: 'reports', icon: '📄' },
    { to: '/caregiver/care-circle', key: 'care_circle', icon: '👨‍👩‍👧' },
    { to: '/caregiver/follow-ups', key: 'follow_ups', icon: '✅' },
    { to: '/caregiver/notifications', key: 'notifications', icon: '🔔' },
    { to: '/caregiver/settings', key: 'settings', icon: '⚙️' }
  ]
};

export default function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  if (!user) return null;
  const items = menus[user.role] || [];

  return (
    <>
      {open && <div className="sidebar-backdrop" onClick={onClose} />}
      <aside className={'sidebar ' + (open ? 'open' : '')} aria-label="Main navigation">
        <div className="brand">
          <span className="brand-logo">❤️</span>
          <div>
            <div className="brand-name">{t('app_name')}</div>
            <div className="brand-tag">{t('tagline')}</div>
          </div>
        </div>
        <nav>
          {items.map(it => (
            <NavLink key={it.to} to={it.to} onClick={onClose} className={({ isActive }) => 'nav-item ' + (isActive ? 'active' : '')}>
              <span className="nav-icon" aria-hidden="true">{it.icon}</span>
              <span>{t(it.key)}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button className="btn-danger" onClick={logout}>{t('logout')}</button>
        </div>
      </aside>
    </>
  );
}