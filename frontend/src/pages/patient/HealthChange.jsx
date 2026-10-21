import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';
import Loading from '../../components/Loading.jsx';

export default function HealthChange() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [reports, setReports] = useState(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [result, setResult] = useState(null);
  const [err, setErr] = useState('');
  const [openingId, setOpeningId] = useState('');

  useEffect(() => {
    api.get('/reports/' + user.id).then(d => {
      const list = (d.reports || []).slice().sort((a, b) =>
        (a.report_date || '').localeCompare(b.report_date || '')
      );
      setReports(list);
      if (list.length >= 2) {
        setFrom(list[0].id);
        setTo(list[list.length - 1].id);
      }
    });
  }, [user.id]);

  const compare = async () => {
    setErr(''); setResult(null);
    if (!from || !to) return setErr('Please select both reports.');
    if (from === to) return setErr('Please select two different reports.');
    try {
      const d = await api.get('/healthchange/' + user.id + '/compare?from=' + from + '&to=' + to);
      setResult(d);
    } catch (e) { setErr(e.message); }
  };

  const openOriginal = async (reportId, which) => {
    setOpeningId(reportId);
    try {
      await api.openProtectedFile(
        '/reports/' + user.id + '/' + reportId + '/file',
        { filename: which + '-report' }
      );
    } catch (e) {
      setErr('Could not open report: ' + e.message);
    } finally {
      setOpeningId('');
    }
  };

  // ---- Safe formatters to avoid rendering objects as React children ----
  const fmtValue = (v) => {
    if (v == null) return '—';
    if (typeof v === 'number') return Number.isInteger(v) ? String(v) : v.toFixed(2);
    if (typeof v === 'string') return v;
    if (typeof v === 'object') {
      if (v.value != null) return String(v.value);
      return '—';
    }
    return String(v);
  };

  const fmtUnit = (u) => (typeof u === 'string' && u) ? u : '';

  if (!reports) return <Loading />;

  return (
    <div>
      <h1>{t('old_vs_new') || 'Old vs New Reports'}</h1>
      <p style={{ color: '#5b6478', marginTop: 0 }}>
        Compare how your test values have changed between two reports.
      </p>

      {reports.length < 2 && (
        <div className="empty">
          You need at least two reports to compare. Upload another report first.
        </div>
      )}

      {reports.length >= 2 && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Choose two reports</h3>
          <div className="grid grid-2">
            <div className="field">
              <label>Previous Report (older)</label>
              <select value={from} onChange={e => setFrom(e.target.value)}>
                <option value="">— Select —</option>
                {reports.map(r => (
                  <option key={r.id} value={r.id}>{r.report_date} — {r.title}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Current Report (newer)</label>
              <select value={to} onChange={e => setTo(e.target.value)}>
                <option value="">— Select —</option>
                {reports.map(r => (
                  <option key={r.id} value={r.id}>{r.report_date} — {r.title}</option>
                ))}
              </select>
            </div>
          </div>
          <button className="btn-primary" onClick={compare}>📊 Compare Reports</button>
        </div>
      )}

      {err && <div className="error">{err}</div>}

      {result && (
        <>
          <div className="card" style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontSize: '0.85em', color: '#5b6478' }}>Previous</div>
              <strong>{result.previous.title}</strong>
              <div style={{ fontSize: '0.85em', color: '#5b6478' }}>📅 {result.previous.date || '—'}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.85em', color: '#5b6478' }}>Current</div>
              <strong>{result.current.title}</strong>
              <div style={{ fontSize: '0.85em', color: '#5b6478' }}>📅 {result.current.date || '—'}</div>
            </div>
          </div>

          {!result.comparisons || result.comparisons.length === 0 ? (
            <div className="empty">
              These two reports do not contain comparable test values.
              <br /><br />
              Both reports must have the same test names (e.g., "Hemoglobin", "Blood Sugar"). Add test values to both reports from the report detail page.
            </div>
          ) : (
            <>
              <div className="grid grid-3" style={{ marginTop: 16 }}>
                <div className="stat-card">
                  <div className="stat-value">{result.comparisons.length}</div>
                  <div className="stat-label">Tests compared</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value" style={{ color: '#dc3545' }}>
                    {result.comparisons.filter(c => c.direction === 'up').length}
                  </div>
                  <div className="stat-label">Increased ↑</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value" style={{ color: '#198754' }}>
                    {result.comparisons.filter(c => c.direction === 'down').length}
                  </div>
                  <div className="stat-label">Decreased ↓</div>
                </div>
              </div>

              <div style={{ overflowX: 'auto', marginTop: 16 }}>
                <table>
                  <thead>
                    <tr>
                      <th>Test</th>
                      <th style={{ textAlign: 'right' }}>Previous</th>
                      <th style={{ textAlign: 'right' }}>Current</th>
                      <th style={{ textAlign: 'right' }}>Change</th>
                      <th style={{ textAlign: 'right' }}>%</th>
                      <th>Trend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.comparisons.map((c, i) => {
                      const color = c.direction === 'up' ? '#dc3545'
                                  : c.direction === 'down' ? '#198754'
                                  : '#5b6478';
                      const arrow = c.direction === 'up' ? '↑'
                                  : c.direction === 'down' ? '↓'
                                  : '→';
                      const unit = fmtUnit(c.unit);

                      return (
                        <tr key={i}>
                          <td><strong>{c.test_name}</strong></td>
                          <td style={{ textAlign: 'right' }}>
                            {fmtValue(c.previous)} {unit && <small style={{ color: '#5b6478' }}>{unit}</small>}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            {fmtValue(c.current)} {unit && <small style={{ color: '#5b6478' }}>{unit}</small>}
                          </td>
                          <td style={{ textAlign: 'right', color, fontWeight: 700 }}>
                            {c.absolute_change != null
                              ? `${arrow} ${Math.abs(c.absolute_change).toFixed(2)}`
                              : '—'}
                          </td>
                          <td style={{ textAlign: 'right', color }}>
                            {c.percent_change != null
                              ? `${c.percent_change > 0 ? '+' : ''}${c.percent_change.toFixed(1)}%`
                              : '—'}
                          </td>
                          <td>
                            {c.status === 'new' && <span className="badge pending">New test</span>}
                            {c.status === 'compared' && c.direction === 'up' && <span className="badge revoked">Increased</span>}
                            {c.status === 'compared' && c.direction === 'down' && <span className="badge confirmed">Decreased</span>}
                            {c.status === 'compared' && c.direction === 'stable' && <span className="badge">No change</span>}
                            {c.status === 'unit_mismatch' && <span className="badge pending">Unit mismatch</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <p style={{ color: '#666', fontSize: '0.9em', marginTop: 12 }}>{result.disclaimer}</p>

          <div className="card" style={{ marginTop: 16 }}>
            <h3 style={{ marginTop: 0 }}>Open the Original Reports</h3>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                className="btn-outline"
                onClick={() => openOriginal(result.previous.id, 'previous')}
                disabled={openingId === result.previous.id}
              >
                📄 {openingId === result.previous.id ? 'Opening…' : 'Open Previous Report'}
              </button>
              <button
                className="btn-outline"
                onClick={() => openOriginal(result.current.id, 'newer')}
                disabled={openingId === result.current.id}
              >
                📄 {openingId === result.current.id ? 'Opening…' : 'Open Newer Report'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}