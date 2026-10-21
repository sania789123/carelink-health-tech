import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';

export default function InviteAccept() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { user, login, register, logout } = useAuth();
  const { t } = useLanguage();

  const [invitation, setInvitation] = useState(null);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  // Auth form state
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [form, setForm] = useState({
    email: '',
    password: '',
    full_name: ''
  });

  const loadInvite = async () => {
    try {
      const d = await api.get('/invitations/' + token);
      setInvitation(d.invitation);
      // Pre-fill the email field
      setForm(f => ({ ...f, email: d.invitation.invitedEmail }));
    } catch (e) {
      setError(e.message || 'This invitation is not valid');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadInvite(); }, [token]);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(''); setInfo(''); setBusy(true);
    try {
      const u = await login(form.email, form.password);
      if (u.role !== 'caregiver') {
        setError('You must log in with a Caregiver account to accept this invitation.');
        logout();
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError(''); setInfo(''); setBusy(true);
    try {
      await register({
        email: form.email,
        password: form.password,
        full_name: form.full_name,
        role: 'caregiver',
        language: 'en'
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const accept = async () => {
    setError(''); setBusy(true);
    try {
      const r = await api.post('/invitations/' + token + '/accept');
      setInfo(r.message || 'Invitation accepted.');
      setTimeout(() => navigate('/caregiver/dashboard'), 1500);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const decline = async () => {
    if (!confirm('Decline this invitation?')) return;
    setError(''); setBusy(true);
    try {
      await api.post('/invitations/' + token + '/decline');
      setInfo('Invitation declined.');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  // ---------- Renders ----------

  if (loading) return <div className="auth-page"><div className="auth-card"><div className="loading">Loading...</div></div></div>;

  if (!invitation) {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <h1>Invitation Not Available</h1>
          <p style={{ color: '#842029' }}>{error || 'This invitation link is invalid or has expired.'}</p>
          <Link className="btn-primary" to="/login">Go to Login</Link>
        </div>
      </div>
    );
  }

  // Logged in as caregiver — show accept/decline
  if (user && user.role === 'caregiver') {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>Caregiver Invitation</h1>
          <p className="tag">You've been invited to help care for a patient</p>

          <div className="card" style={{ textAlign: 'left' }}>
            <p><strong>Patient:</strong> {invitation.patientName}</p>
            <p><strong>Your invitation is for:</strong> {invitation.invitedEmail}</p>
            <p><strong>You will be able to:</strong></p>
            <ul style={{ marginTop: 4 }}>
              {invitation.permissions.map(p => (
                <li key={p}>{p.replace(/_/g, ' ')}</li>
              ))}
            </ul>
            <p style={{ fontSize: '0.85em', color: '#5b6478', marginTop: 12 }}>
              Expires: {new Date(invitation.expiresAt).toLocaleString()}
            </p>
          </div>

          {error && <div className="error">{error}</div>}
          {info && <div className="success">{info}</div>}

          <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
            <button className="btn-primary" onClick={accept} disabled={busy} style={{ flex: 1 }}>
              {busy ? 'Please wait…' : 'Accept Invitation'}
            </button>
            <button className="btn-outline" onClick={decline} disabled={busy} style={{ flex: 1 }}>
              Decline
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Logged in but NOT a caregiver
  if (user && user.role !== 'caregiver') {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <h1>Wrong Account Type</h1>
          <p>
            You are logged in as a <strong>{user.role}</strong>, but this invitation is meant for a <strong>caregiver</strong>.
          </p>
          <p>Please log out and log in with a caregiver account, or register a new caregiver account.</p>
          <button className="btn-primary" onClick={logout}>Log Out</button>
        </div>
      </div>
    );
  }

  // Not logged in — show login / register forms
  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>You've Been Invited</h1>
        <p className="tag">
          <strong>{invitation.patientName}</strong> invited you to be their caregiver on CareLink.
        </p>

        {error && <div className="error">{error}</div>}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button
            type="button"
            className={mode === 'login' ? 'btn-primary' : 'btn-outline'}
            onClick={() => setMode('login')}
            style={{ flex: 1 }}
          >
            Log In
          </button>
          <button
            type="button"
            className={mode === 'register' ? 'btn-primary' : 'btn-outline'}
            onClick={() => setMode('register')}
            style={{ flex: 1 }}
          >
            Register
          </button>
        </div>

        {mode === 'login' ? (
          <form onSubmit={handleLogin}>
            <div className="field">
              <label>Email</label>
              <input
                type="email"
                value={form.email}
                onChange={set('email')}
                required
              />
            </div>
            <div className="field">
              <label>Password</label>
              <input
                type="password"
                value={form.password}
                onChange={set('password')}
                required
              />
            </div>
            <button className="btn-primary" style={{ width: '100%' }} disabled={busy}>
              {busy ? 'Logging in…' : 'Log In & Accept'}
            </button>
            <p style={{ marginTop: 12, fontSize: '0.85em', color: '#5b6478', textAlign: 'center' }}>
              Use the caregiver account associated with <strong>{invitation.invitedEmail}</strong>
            </p>
          </form>
        ) : (
          <form onSubmit={handleRegister}>
            <div className="field">
              <label>Full Name</label>
              <input
                value={form.full_name}
                onChange={set('full_name')}
                required
              />
            </div>
            <div className="field">
              <label>Email</label>
              <input
                type="email"
                value={form.email}
                onChange={set('email')}
                required
              />
            </div>
            <div className="field">
              <label>Create Password</label>
              <input
                type="password"
                value={form.password}
                onChange={set('password')}
                required
                minLength={8}
              />
            </div>
            <button className="btn-primary" style={{ width: '100%' }} disabled={busy}>
              {busy ? 'Creating account…' : 'Register as Caregiver'}
            </button>
            <p style={{ marginTop: 12, fontSize: '0.85em', color: '#5b6478', textAlign: 'center' }}>
              Registering will link your account to <strong>{invitation.patientName}</strong>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}