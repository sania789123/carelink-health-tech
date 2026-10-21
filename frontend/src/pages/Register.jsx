import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';

export default function Register() {
  const { register } = useAuth();
  const { t } = useLanguage();
  const nav = useNavigate();
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'patient',
    phone: '',
    language: 'en'
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false); // UI only: show/hide password

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const setRole = (role) => setForm(f => ({ ...f, role }));

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      const u = await register(form);
      nav('/' + u.role + '/dashboard');
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  const roles = [
    { value: 'patient', icon: '🧑', label: t('patient') || 'Patient' },
    { value: 'doctor', icon: '👩‍⚕️', label: t('doctor') || 'Doctor' },
    { value: 'caregiver', icon: '🤝', label: t('caregiver') || 'Caregiver' }
  ];

  return (
    <div className="login-split">
      {/* ---------- LEFT: brand panel ---------- */}
      <aside className="login-visual">
        <div className="login-visual-inner">
          <div className="login-brand">
            <span style={{ fontSize: '2.2em' }} aria-hidden="true">❤️</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.3em' }}>CareLink</div>
              <div style={{ fontSize: '0.85em', opacity: 0.85 }}>Health Tech</div>
            </div>
          </div>

          <h2 className="login-headline">Join CareLink today.</h2>
          <p className="login-sub">
            Create your free account in under a minute and bring your reports,
            medicines and care team into one place.
          </p>

          <div className="login-feature-list">
            <div className="feature-row">
              <span className="feature-icon" aria-hidden="true">📄</span>
              <span className="feature-text">Keep all medical reports organized</span>
            </div>
            <div className="feature-row">
              <span className="feature-icon" aria-hidden="true">💊</span>
              <span className="feature-text">Follow doctor-approved care plans</span>
            </div>
            <div className="feature-row">
              <span className="feature-icon" aria-hidden="true">👨‍👩‍👧</span>
              <span className="feature-text">Share safely with your family</span>
            </div>
          </div>

          <div className="login-illustration" aria-hidden="true">
            <div className="illustration-circle small"><span style={{ fontSize: '1.8em' }}>💊</span></div>
            <div className="illustration-circle"><span style={{ fontSize: '3em' }}>🩺</span></div>
            <div className="illustration-circle small"><span style={{ fontSize: '1.8em' }}>📄</span></div>
          </div>
        </div>
      </aside>

      {/* ---------- RIGHT: form ---------- */}
      <main className="login-form-side">
        <form className="login-form" onSubmit={submit}>
          <Link to="/" style={{ display: 'inline-block', marginBottom: 24, fontSize: '0.95em' }}>
            ← Back to home
          </Link>

          <h1 style={{ margin: '0 0 6px', fontSize: '2em' }}>
            {t('register') || 'Register'}
          </h1>
          <p style={{ color: 'var(--muted)', margin: '0 0 24px' }}>
            Create your CareLink account
          </p>

          {error && <div className="error" role="alert">{error}</div>}

          <div className="field">
            <label>{t('role') || 'I am a'}</label>
            <div className="role-grid" style={{ marginBottom: 0 }}>
              {roles.map(r => (
                <button
                  key={r.value}
                  type="button"
                  className={'role-tile' + (form.role === r.value ? ' active' : '')}
                  onClick={() => setRole(r.value)}
                  aria-pressed={form.role === r.value}
                >
                  <div style={{ fontSize: '1.6em' }} aria-hidden="true">{r.icon}</div>
                  <div style={{ fontWeight: 600, fontSize: '0.9em' }}>{r.label}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label htmlFor="full_name">{t('full_name') || 'Full Name'}</label>
            <input
              id="full_name"
              value={form.full_name}
              onChange={set('full_name')}
              placeholder="Your full name"
              required
            />
          </div>

          <div className="field">
            <label htmlFor="reg_email">{t('email') || 'Email'}</label>
            <input
              id="reg_email"
              type="email"
              value={form.email}
              onChange={set('email')}
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="field">
            <label htmlFor="reg_password">{t('password') || 'Password'}</label>
            <div style={{ position: 'relative' }}>
              <input
                id="reg_password"
                type={showPw ? 'text' : 'password'}
                value={form.password}
                onChange={set('password')}
                placeholder="At least 8 characters"
                required
                minLength={8}
                style={{ paddingRight: 64 }}
              />
              <button
                type="button"
                onClick={() => setShowPw(s => !s)}
                aria-label={showPw ? 'Hide password' : 'Show password'}
                style={{
                  position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: 'var(--primary)',
                  fontWeight: 600, cursor: 'pointer', padding: '6px 8px'
                }}
              >
                {showPw ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <div className="field">
            <label htmlFor="phone">{t('phone') || 'Phone'}</label>
            <input
              id="phone"
              value={form.phone}
              onChange={set('phone')}
              placeholder="Optional"
            />
          </div>

          <button className="btn-primary login-submit" disabled={busy}>
            {busy ? (t('loading') || 'Loading…') : (t('register') || 'Register')}
          </button>

          <p style={{ marginTop: 16, textAlign: 'center', color: 'var(--muted)' }}>
            Already have an account? <Link to="/login">{t('login') || 'Login'}</Link>
          </p>
        </form>
      </main>
    </div>
  );
}
