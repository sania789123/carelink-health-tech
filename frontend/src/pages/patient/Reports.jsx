import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';
import Loading from '../../components/Loading.jsx';

export default function Reports() {
  const { user } = useAuth();
  const { t, speak } = useLanguage();

  const [reports, setReports] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [disclaimer, setDisclaimer] = useState('');
  const [q, setQ] = useState('');
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [deletingId, setDeletingId] = useState('');

  const load = () => {
    Promise.all([
      api.get('/reports/' + user.id),
      api.get('/reports/' + user.id + '/suggestions').catch(() => ({ suggestions: [], disclaimer: '' }))
    ])
      .then(([repRes, sugRes]) => {
        setReports(repRes.reports || []);
        setSuggestions(sugRes.suggestions || []);
        setDisclaimer(sugRes.disclaimer || '');
      })
      .catch(e => setErr(e.message));
  };

  useEffect(() => { load(); }, [user.id]);

  const deleteReport = async (report) => {
    const ok = window.confirm(
      `Delete "${report.title}"?\n\nThis will permanently remove the report and all its test values. This cannot be undone.`
    );
    if (!ok) return;

    setDeletingId(report.id);
    setErr(''); setMsg('');
    try {
      await api.del('/reports/' + user.id + '/' + report.id);
      setMsg(`Deleted: ${report.title}`);
      load();
    } catch (e) {
      setErr('Could not delete: ' + e.message);
    } finally {
      setDeletingId('');
    }
  };

  if (err && !reports) return <div className="error">{err}</div>;
  if (!reports) return <Loading />;

  const filtered = reports.filter(r =>
    !q ||
    r.title.toLowerCase().includes(q.toLowerCase()) ||
    (r.hospital || '').toLowerCase().includes(q.toLowerCase())
  );

  const badgeFor = (priority) => {
    if (priority === 'high') return { label: t('suggestion_high') || 'Recommended', cls: 'badge confirmed' };
    if (priority === 'medium') return { label: t('suggestion_medium') || 'Consider', cls: 'badge pending' };
    return { label: t('suggestion_low') || 'Optional', cls: 'badge' };
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>{t('reports') || 'Medical Reports'}</h1>
        <Link className="btn-primary" to="/patient/reports/upload">
          {t('upload_report') || 'Upload Report'}
        </Link>
      </div>

      {msg && <div className="success">{msg}</div>}
      {err && <div className="error">{err}</div>}

      {/* ================= Suggested Specialists ================= */}
      {suggestions.length > 0 && (
        <section style={{ marginTop: 24 }}>
          <h2 style={{ marginBottom: 4 }}>
            🩺 {t('suggested_specialists') || 'Suggested Specialists'}
          </h2>
          <p style={{ color: '#5b6478', marginTop: 0 }}>
            {t('suggested_specialists_desc') ||
              'Based on your reports, you may benefit from consulting one of these specialists.'}
          </p>

          <div className="grid grid-2" style={{ marginTop: 16 }}>
            {suggestions.map((s, i) => {
              const badge = badgeFor(s.priority);
              return (
                <div key={i} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ fontSize: '2em' }} aria-hidden="true">{s.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '1.1em' }}>{s.specialty}</div>
                      <div style={{ color: '#5b6478', fontSize: '0.9em' }}>{s.description}</div>
                    </div>
                    <span className={badge.cls}>{badge.label}</span>
                  </div>

                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontWeight: 600, marginBottom: 6 }}>
                      {t('why_see') || 'Why see this specialist'}:
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 20, color: '#1a2233' }}>
                      {s.reasons.slice(0, 4).map((r, ri) => (
                        <li key={ri} style={{ marginBottom: 4, fontSize: '0.95em' }}>{r}</li>
                      ))}
                    </ul>
                  </div>

                  <div style={{ marginTop: 12 }}>
                    <button
                      className="btn-outline"
                      onClick={() => speak(`${s.specialty}. ${s.description}. ${s.reasons.join('. ')}`)}
                    >
                      🔊 Read Aloud
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {disclaimer && (
            <div style={{
              marginTop: 16,
              padding: 12,
              background: '#fff7e6',
              border: '1px solid #f0c36d',
              borderRadius: 8,
              fontSize: '0.9em',
              color: '#664d03'
            }}>
              <strong>⚠️ {t('suggestion_disclaimer_label') || 'Important'}:</strong> {disclaimer}
            </div>
          )}
        </section>
      )}

      {/* ================= All Reports ================= */}
      <section style={{ marginTop: 32 }}>
        <h2>All Reports ({reports.length})</h2>

        <input
          placeholder="Search reports..."
          value={q}
          onChange={e => setQ(e.target.value)}
          style={{
            padding: '12px 14px',
            border: '2px solid #dde3ec',
            borderRadius: 8,
            marginBottom: 16,
            width: '100%',
            fontSize: '1em'
          }}
        />

        {filtered.length === 0 ? (
          <div className="empty">{t('no_data') || 'No data available'}</div>
        ) : filtered.map(r => (
          <div
            key={r.id}
            className="report-row"
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}
          >
            <Link
              to={'/patient/reports/' + r.id}
              style={{ textDecoration: 'none', color: 'inherit', flex: 1 }}
            >
              <strong>{r.title}</strong>
              <div style={{ fontSize: '0.85em', color: '#5b6478', marginTop: 2 }}>
                {r.report_date || '—'}
                {r.hospital ? ' • ' + r.hospital : ''}
                {r.report_type ? ' • ' + r.report_type : ''}
              </div>
            </Link>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span className="badge confirmed">{r.report_type}</span>
              <button
                className="btn-outline"
                onClick={(e) => { e.preventDefault(); deleteReport(r); }}
                disabled={deletingId === r.id}
                style={{ borderColor: '#dc3545', color: '#dc3545' }}
                title="Delete this report"
              >
                🗑️ {deletingId === r.id ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}