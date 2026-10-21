import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';
import Loading from '../../components/Loading.jsx';

export default function Dashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/patients/' + user.id + '/dashboard')
      .then(setData)
      .catch(e => setError(e.message));
  }, [user.id]);

  if (error) return <div className="error">{error}</div>;
  if (!data) return <Loading />;

  // Visual action cards — each label/desc comes from translations
  const actions = [
    {
      to: '/patient/reports/upload',
      icon: '📤',
      color: '#0d6efd',
      labelKey: 'action_upload_report',
      descKey: 'action_upload_report_desc',
      label: 'Upload a Report',
      desc: 'Add a lab report or prescription'
    },
    {
      to: '/patient/medicines',
      icon: '💊',
      color: '#fd7e14',
      labelKey: 'action_my_medicines',
      descKey: 'action_my_medicines_desc',
      label: 'My Medicines',
      desc: "See today's schedule"
    },
    {
      to: '/patient/reports',
      icon: '📄',
      color: '#198754',
      labelKey: 'action_my_reports',
      descKey: 'action_my_reports_desc',
      label: 'My Reports',
      desc: 'View all your reports'
    },
    {
      to: '/patient/doctor-connect',
      icon: '🔗',
      color: '#6f42c1',
      labelKey: 'action_share_doctor',
      descKey: 'action_share_doctor_desc',
      label: 'Share with Doctor',
      desc: 'Generate a QR code'
    },
    {
      to: '/patient/care-circle',
      icon: '👨‍👩‍👧',
      color: '#d63384',
      labelKey: 'action_my_family',
      descKey: 'action_my_family_desc',
      label: 'My Family',
      desc: 'Caregivers helping you'
    },
    {
      to: '/patient/recovery-track',
      icon: '💪',
      color: '#20c997',
      labelKey: 'action_care_plan',
      descKey: 'action_care_plan_desc',
      label: "Today's Care Plan",
      desc: 'Tasks from your doctor'
    }
  ];

  return (
    <div>
      {/* ================= Welcome ================= */}
      <div className="welcome-card">
        <div className="welcome-text">
          <h1 style={{ margin: 0, fontSize: '1.8em' }}>
            {t('welcome') || 'Welcome'}, {user.full_name.split(' ')[0]}!
          </h1>
          <p style={{ margin: '8px 0 0', color: '#5b6478' }}>
            {t('dashboard_subtitle') || "Here's what's happening with your health today."}
          </p>
        </div>
      </div>

      {/* ================= Stat Cards ================= */}
      <div className="grid grid-3" style={{ marginTop: 20 }}>
        <Link to="/patient/medicines" className="stat-card-link">
          <div className="stat-card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2.4em' }}>💊</div>
            <div className="stat-value">{data.medCount}</div>
            <div className="stat-label">{t('medicines') || 'Medicines'}</div>
          </div>
        </Link>
        <Link to="/patient/reports" className="stat-card-link">
          <div className="stat-card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2.4em' }}>📄</div>
            <div className="stat-value">{data.repCount}</div>
            <div className="stat-label">{t('reports') || 'Reports'}</div>
          </div>
        </Link>
        <Link to="/patient/recovery-track" className="stat-card-link">
          <div className="stat-card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2.4em' }}>✅</div>
            <div className="stat-value">{data.taskCount}</div>
            <div className="stat-label">{t('follow_ups') || 'Follow-ups'}</div>
          </div>
        </Link>
      </div>

      {/* ================= Big Action Cards ================= */}
      <h2 style={{ marginTop: 32 }}>{t('what_to_do') || 'What would you like to do?'}</h2>
      <div className="action-grid">
        {actions.map(a => (
          <Link
            key={a.to}
            to={a.to}
            className="action-card"
            style={{ '--accent': a.color }}
          >
            <div className="action-icon" style={{ background: a.color + '18', color: a.color }}>
              {a.icon}
            </div>
            <div className="action-label">{t(a.labelKey) || a.label}</div>
            <div className="action-desc">{t(a.descKey) || a.desc}</div>
          </Link>
        ))}
      </div>

      {/* ================= Upcoming Medicines ================= */}
      <section style={{ marginTop: 32 }}>
        <h2>💊 {t('todays_medicines') || "Today's Medicines"}</h2>
        {data.meds.length === 0 ? (
          <div className="empty">
            {t('no_medicines_yet') || 'No medicines yet.'}{' '}
            <Link to="/patient/medicines/upload">{t('add_one') || 'Add one'}</Link>.
          </div>
        ) : (
          <div className="grid grid-2">
            {data.meds.map(m => {
              const times = JSON.parse(m.times || '[]');
              return (
                <div key={m.id} className="card" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{ fontSize: '2em' }}>💊</div>
                  <div style={{ flex: 1 }}>
                    <strong style={{ fontSize: '1.1em' }}>{m.name}</strong>
                    <div style={{ color: '#5b6478', fontSize: '0.9em' }}>{m.dosage}</div>
                    <div style={{ marginTop: 4 }}>
                      {times.map((tm, i) => (
                        <span key={i} className="badge confirmed" style={{ marginRight: 4 }}>🕐 {tm}</span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ================= Recent Activity ================= */}
      <section style={{ marginTop: 32 }}>
        <h2>🔔 {t('recent_activity') || 'Recent Activity'}</h2>
        {data.notifs.length === 0 ? (
          <div className="empty">{t('no_recent_activity') || 'No recent activity.'}</div>
        ) : (
          data.notifs.map(n => (
            <div key={n.id} className="report-row">
              <div>
                <strong>{n.title}</strong>
                <div style={{ fontSize: '0.9em', color: '#5b6478', marginTop: 2 }}>{n.message}</div>
              </div>
              <small style={{ color: '#5b6478' }}>
                {new Date(n.created_at).toLocaleDateString()}
              </small>
            </div>
          ))
        )}
      </section>
    </div>
  );
}