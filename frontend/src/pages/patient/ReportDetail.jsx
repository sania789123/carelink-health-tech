import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';
import Loading from '../../components/Loading.jsx';

export default function ReportDetail() {
  const { reportId } = useParams();
  const { user } = useAuth();
  const { t, speak } = useLanguage();
  const nav = useNavigate();

  const [data, setData] = useState(null);
  const [newTest, setNewTest] = useState({ test_name: '', value: '', unit: '', reference_range: '' });
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [opening, setOpening] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = () =>
    api.get('/reports/' + user.id + '/' + reportId)
      .then(setData)
      .catch(e => setErr(e.message));

  useEffect(() => { load(); }, [user.id, reportId]);

  if (err && !data) return <div className="error">{err}</div>;
  if (!data) return <Loading />;
  const { report, tests } = data;

  const addTest = async (e) => {
    e.preventDefault();
    if (!newTest.test_name.trim()) return;
    try {
      await api.post('/reports/' + user.id + '/' + reportId + '/tests', {
        test_name: newTest.test_name.trim(),
        value: newTest.value !== '' ? Number(newTest.value) : null,
        unit: newTest.unit || null,
        reference_range: newTest.reference_range || null
      });
      setNewTest({ test_name: '', value: '', unit: '', reference_range: '' });
      setMsg('Test added.');
      load();
    } catch (e) { setErr(e.message); }
  };

  const openOriginal = async () => {
    setOpening(true); setErr('');
    try {
      await api.openProtectedFile(
        '/reports/' + user.id + '/' + reportId + '/file',
        { filename: (report.title || 'report') + (report.file_path?.match(/\.[^.]+$/) || [''])[0] }
      );
    } catch (e) {
      setErr('Could not open the original document: ' + e.message);
    } finally {
      setOpening(false);
    }
  };

  const deleteReport = async () => {
    const ok = window.confirm(
      `Delete "${report.title}"?\n\nThis will permanently remove the report and all its test values. This cannot be undone.`
    );
    if (!ok) return;

    setDeleting(true); setErr('');
    try {
      await api.del('/reports/' + user.id + '/' + reportId);
      nav('/patient/reports');
    } catch (e) {
      setErr('Could not delete: ' + e.message);
      setDeleting(false);
    }
  };

  const setNT = (k) => (e) => setNewTest(t => ({ ...t, [k]: e.target.value }));

  const readAloud = () => {
    const lines = [
      report.title,
      report.report_date ? 'Date: ' + report.report_date : '',
      report.hospital ? 'Hospital: ' + report.hospital : '',
      tests.length ? `Contains ${tests.length} test results.` : 'No test results recorded.'
    ].filter(Boolean);
    speak(lines.join('. '));
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <Link to="/patient/reports">← Back to reports</Link>
        <button
          className="btn-outline"
          onClick={deleteReport}
          disabled={deleting}
          style={{ borderColor: '#dc3545', color: '#dc3545' }}
        >
          🗑️ {deleting ? 'Deleting…' : 'Delete Report'}
        </button>
      </div>

      <h1 style={{ marginTop: 8 }}>{report.title}</h1>

      {err && <div className="error">{err}</div>}
      {msg && <div className="success">{msg}</div>}

      <div className="card">
        <div className="grid grid-2">
          <div>
            <div style={{ fontSize: '0.85em', color: '#5b6478' }}>Type</div>
            <div style={{ fontWeight: 600 }}>{report.report_type}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.85em', color: '#5b6478' }}>Date</div>
            <div style={{ fontWeight: 600 }}>{report.report_date || '—'}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.85em', color: '#5b6478' }}>Hospital / Lab</div>
            <div style={{ fontWeight: 600 }}>{report.hospital || '—'}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.85em', color: '#5b6478' }}>Doctor</div>
            <div style={{ fontWeight: 600 }}>{report.doctor_name || '—'}</div>
          </div>
        </div>

        {report.notes && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: '0.85em', color: '#5b6478' }}>Notes</div>
            <div>{report.notes}</div>
          </div>
        )}

        <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {report.file_path && (
            <button className="btn-outline" onClick={openOriginal} disabled={opening}>
              📄 {opening ? 'Opening…' : 'View Original Document'}
            </button>
          )}
          <button className="btn-outline" onClick={readAloud}>🔊 Read Aloud</button>
        </div>

        {report.file_path && /\.(jpg|jpeg|png)$/i.test(report.file_path) && (
          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <img
              src={'/api/reports/' + user.id + '/' + reportId + '/file'}
              alt={report.title}
              style={{ maxWidth: '100%', maxHeight: 400, borderRadius: 8, border: '1px solid #dde3ec' }}
              onError={e => { e.target.style.display = 'none'; }}
            />
          </div>
        )}
      </div>

      <SummaryBlock patientId={user.id} reportId={reportId} onSpeak={speak} />

      <h2 style={{ marginTop: 24 }}>Test Results ({tests.length})</h2>
      {tests.length === 0 ? (
        <div className="empty">
          No test results recorded yet. Add them below to enable comparisons and specialist suggestions.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Test</th><th>Value</th><th>Unit</th><th>Reference Range</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {tests.map(t => {
                const status = computeStatus(t);
                return (
                  <tr key={t.id}>
                    <td><strong>{t.test_name}</strong></td>
                    <td>{t.value}</td>
                    <td>{t.unit || '—'}</td>
                    <td>{t.reference_range || '—'}</td>
                    <td>
                      {status === 'in-range' && <span className="badge confirmed">In range</span>}
                      {status === 'out-of-range' && <span className="badge revoked">Out of range</span>}
                      {status === 'unknown' && <span className="badge pending">No reference</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <h2 style={{ marginTop: 24 }}>Add Test Result</h2>
      <form className="card" onSubmit={addTest}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 8 }}>
          <div className="field" style={{ margin: 0 }}>
            <label>Test Name *</label>
            <input required value={newTest.test_name} onChange={setNT('test_name')} />
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label>Value</label>
            <input value={newTest.value} onChange={setNT('value')} />
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label>Unit</label>
            <input value={newTest.unit} onChange={setNT('unit')} />
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label>Reference</label>
            <input value={newTest.reference_range} onChange={setNT('reference_range')} />
          </div>
        </div>
        <button className="btn-primary" style={{ marginTop: 12 }}>Add</button>
      </form>
    </div>
  );
}

function SummaryBlock({ patientId, reportId, onSpeak }) {
  const [summary, setSummary] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get('/reports/' + patientId + '/' + reportId + '/summary')
      .then(d => setSummary(d.summary))
      .catch(e => setErr(e.message));
  }, [patientId, reportId]);

  if (err || !summary) return null;

  const statusColor = (s) =>
    s === 'high' || s === 'low' ? '#b02a37'
    : s === 'normal' ? '#0f5132'
    : '#664d03';

  const statusBg = (s) =>
    s === 'high' || s === 'low' ? '#fff3cd'
    : s === 'normal' ? '#e7f5ee'
    : '#f8fafd';

  return (
    <div className="card" style={{ marginTop: 16, background: '#eef4ff', borderColor: '#0d6efd' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <h3 style={{ margin: 0 }}>🧠 What this report means (in simple words)</h3>
        <button
          className="btn-outline"
          onClick={() => onSpeak(summary.overall + '. ' + summary.lines.map(l => l.text).join('. '))}
        >
          🔊 Read Aloud
        </button>
      </div>

      <p style={{ fontSize: '1.05em', marginTop: 12, fontWeight: 500 }}>
        {summary.overall}
      </p>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        <span className="badge confirmed">✅ {summary.normalCount} normal</span>
        {summary.abnormalCount > 0 && (
          <span className="badge revoked">⚠️ {summary.abnormalCount} need attention</span>
        )}
      </div>

      <div>
        {summary.lines.map((line, i) => (
          <div
            key={i}
            style={{
              padding: '10px 12px',
              marginBottom: 6,
              background: statusBg(line.status),
              color: statusColor(line.status),
              borderRadius: 8,
              fontWeight: 500
            }}
          >
            {line.text}
          </div>
        ))}
      </div>

      <p style={{ fontSize: '0.85em', color: '#5b6478', marginTop: 12, marginBottom: 0 }}>
        ℹ️ {summary.disclaimer}
      </p>
    </div>
  );
}

function computeStatus(t) {
  if (t.value == null || !t.reference_range) return 'unknown';
  const val = Number(t.value);
  if (!isFinite(val)) return 'unknown';
  const range = String(t.reference_range).trim();

  const lt = range.match(/^<\s*([\d.]+)/);
  if (lt) return val < Number(lt[1]) ? 'in-range' : 'out-of-range';

  const gt = range.match(/^>\s*([\d.]+)/);
  if (gt) return val > Number(gt[1]) ? 'in-range' : 'out-of-range';

  const dash = range.match(/([\d.]+)\s*[-–]\s*([\d.]+)/);
  if (dash) {
    const lo = Number(dash[1]), hi = Number(dash[2]);
    return val >= lo && val <= hi ? 'in-range' : 'out-of-range';
  }

  return 'unknown';
}