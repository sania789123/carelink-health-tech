import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';

export default function Login() {
  const { login } = useAuth();
  const { t } = useLanguage();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false); // UI only: show/hide password

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      const u = await login(email, password);
      nav('/' + u.role + '/dashboard');
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  const quick = (e, p) => { setEmail(e); setPassword(p); };

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

          <h2 className="login-headline">Better Care, Together.</h2>
          <p className="login-sub">
            Keep medical reports organized, follow doctor-approved care plans,
            and help your loved ones manage their health with confidence.
          </p>

          <div className="login-feature-list">
            <div className="feature-row">
              <span className="feature-icon" aria-hidden="true">🚫</span>
              <span className="feature-text">No ads, ever</span>
            </div>
            <div className="feature-row">
              <span className="feature-icon" aria-hidden="true">🔒</span>
              <span className="feature-text">Your data stays yours</span>
            </div>
            <div className="feature-row">
              <span className="feature-icon" aria-hidden="true">📱</span>
              <span className="feature-text">Works on any phone</span>
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
            {t('app_name') || 'CareLink Health Tech'}
          </h1>
          <p className="tag" style={{ color: 'var(--muted)', margin: '0 0 28px' }}>
            {t('tagline') || 'Connected Care, Beyond the Consultation'}
          </p>

          {error && <div className="error" role="alert">{error}</div>}

          <div className="field">
            <label htmlFor="email">{t('email') || 'Email'}</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </div>

          <div className="field">
            <label htmlFor="password">{t('password') || 'Password'}</label>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                autoComplete="current-password"
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

          <button className="btn-primary login-submit" disabled={busy}>
            {busy ? (t('loading') || 'Loading…') : (t('login') || 'Login')}
          </button>

          <p style={{ marginTop: 16, textAlign: 'center', color: 'var(--muted)' }}>
            New here? <Link to="/register">{t('register') || 'Register'}</Link>
          </p>

          <div className="login-divider">Quick demo login</div>

          <div className="demo-grid">
            <button
              type="button"
              className="demo-tile"
              onClick={() => quick('patient@demo.com', 'Patient123!')}
            >
              <span style={{ fontSize: '1.6em' }} aria-hidden="true">🧑</span>
              Patient
            </button>
            <button
              type="button"
              className="demo-tile"
              onClick={() => quick('doctor@demo.com', 'Doctor123!')}
            >
              <span style={{ fontSize: '1.6em' }} aria-hidden="true">👩‍⚕️</span>
              Doctor
            </button>
            <button
              type="button"
              className="demo-tile"
              onClick={() => quick('caregiver@demo.com', 'Caregiver123!')}
            >
              <span style={{ fontSize: '1.6em' }} aria-hidden="true">🤝</span>
              Caregiver
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
