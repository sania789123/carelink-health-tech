import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';
import Loading from '../../components/Loading.jsx';

export default function DoctorConnect() {
  const { user } = useAuth();
  const { t, speak } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [reports, setReports] = useState([]);
  const [selected, setSelected] = useState([]);
  const [hours, setHours] = useState(24);
  const [maxUses, setMaxUses] = useState(1);

  const [created, setCreated] = useState(null);
  const [tokens, setTokens] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [busy, setBusy] = useState(false);

  const loadTokens = async () => {
    try {
      const d = await api.get('/qrshare/' + user.id + '/list');
      setTokens(d.tokens || []);
    } catch (e) { /* ignore */ }
  };

  const loadReports = async () => {
    try {
      const d = await api.get('/reports/' + user.id);
      setReports(d.reports || []);
    } catch (e) {
      setError(e.message);
    }
  };

  useEffect(() => {
    Promise.all([loadReports(), loadTokens()]).finally(() => setLoading(false));
  }, [user.id]);

  const toggle = (id) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const selectAll = () => setSelected(reports.map(r => r.id));
  const clearAll = () => setSelected([]);

  const generate = async () => {
    setError(''); setSuccess(''); setCreated(null); setBusy(true);
    if (selected.length === 0) {
      setError('Please select at least one report.');
      setBusy(false);
      return;
    }
    try {
      const d = await api.post('/qrshare/' + user.id + '/create', {
        reportIds: selected,
        expiresInHours: Number(hours) || 24,
        maxUses: Number(maxUses) || 1
      });
      setCreated(d);
      setSuccess('QR code generated. Share it with your doctor.');
      loadTokens();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (id) => {
    if (!confirm('Revoke this share? The doctor will lose access immediately.')) return;
    try {
      await api.post('/qrshare/' + user.id + '/revoke/' + id);
      loadTokens();
    } catch (e) { setError(e.message); }
  };

  const deleteToken = async (id) => {
    if (!confirm('Delete this token permanently? This cannot be undone.')) return;
    try {
      await api.del('/qrshare/' + user.id + '/delete/' + id);
      loadTokens();
    } catch (e) { setError(e.message); }
  };

  const copyLink = async () => {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.shareUrl);
      setSuccess('Link copied to clipboard.');
    } catch {
      setError('Copy failed. Please select and copy the link manually.');
    }
  };

  const downloadQR = () => {
    if (!created?.qrDataUrl) return;
    const a = document.createElement('a');
    a.href = created.qrDataUrl;
    a.download = 'carelink-qr.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const openPreview = () => setShowPreview(true);
  const closePreview = () => setShowPreview(false);

  if (loading) return <Loading />;

  const selectedReports = reports.filter(r => selected.includes(r.id));

  return (
    <div>
      <h1>{t('doctor_connect') || 'Doctor Connect'}</h1>
      <p style={{ color: '#5b6478', marginTop: 0 }}>
        Share selected reports with a doctor via a secure QR code. The QR contains only a secure link — no medical data.
      </p>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <h3 style={{ margin: 0 }}>Select Reports</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn-outline" onClick={selectAll} disabled={reports.length === 0}>
              Share All Reports ({reports.length})
            </button>
            <button className="btn-outline" onClick={clearAll} disabled={selected.length === 0}>
              Clear
            </button>
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          {reports.length === 0 ? (
            <div className="empty">No reports to share yet.</div>
          ) : reports.map(r => (
            <label key={r.id} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: 10,
              borderBottom: '1px solid #eef2f7', cursor: 'pointer'
            }}>
              <input
                type="checkbox"
                checked={selected.includes(r.id)}
                onChange={() => toggle(r.id)}
                style={{ width: 20, height: 20 }}
              />
              <div style={{ flex: 1 }}>
                <strong>{r.title}</strong>
                <div style={{ fontSize: '0.85em', color: '#5b6478' }}>
                  {r.report_date || 'No date'} {r.hospital ? '• ' + r.hospital : ''} {r.report_type ? '• ' + r.report_type : ''}
                </div>
              </div>
            </label>
          ))}
        </div>

        <div className="grid grid-2" style={{ marginTop: 16 }}>
          <div className="field">
            <label>Link expires in (hours)</label>
            <input type="number" min="1" max="720" value={hours} onChange={e => setHours(e.target.value)} />
          </div>
          <div className="field">
            <label>Maximum uses</label>
            <input type="number" min="1" max="20" value={maxUses} onChange={e => setMaxUses(e.target.value)} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
          <button className="btn-primary" onClick={generate} disabled={busy || selected.length === 0}>
            {busy ? 'Generating…' : `Generate QR Code (${selected.length})`}
          </button>
          <button className="btn-outline" onClick={openPreview} disabled={selected.length === 0}>
            Preview Shared Reports
          </button>
          <button className="btn-outline" onClick={() => speak('Share ' + selected.length + ' reports with a doctor.')}>
            🔊 Read Aloud
          </button>
        </div>
      </div>

      {created && (
        <div className="card" style={{ textAlign: 'center', borderColor: '#198754' }}>
          <h3 style={{ marginTop: 0 }}>✅ QR Code Ready</h3>
          <img src={created.qrDataUrl} alt="Share QR" style={{ maxWidth: 300, width: '100%', margin: '12px auto', display: 'block' }} />
          <div style={{
            wordBreak: 'break-all', fontSize: '0.85em', padding: 12,
            background: '#f8fafd', borderRadius: 8, marginBottom: 12
          }}>
            {created.shareUrl}
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn-primary" onClick={copyLink}>📋 Copy Secure Link</button>
            <button className="btn-outline" onClick={downloadQR}>⬇️ Download QR (PNG)</button>
            <a className="btn-outline" href={created.shareUrl} target="_blank" rel="noreferrer">👁️ Preview Share</a>
          </div>

          <p style={{ fontSize: '0.85em', color: '#5b6478', marginTop: 12 }}>
            Expires: {new Date(created.expiresAt).toLocaleString()}
          </p>
        </div>
      )}

      {showPreview && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16
        }} onClick={closePreview}>
          <div className="card" style={{ maxWidth: 600, width: '100%', maxHeight: '80vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Reports to Share ({selectedReports.length})</h3>
            {selectedReports.map(r => (
              <div key={r.id} style={{ padding: 10, borderBottom: '1px solid #eef2f7' }}>
                <strong>{r.title}</strong>
                <div style={{ fontSize: '0.85em', color: '#5b6478' }}>
                  {r.report_date || 'No date'} {r.hospital ? '• ' + r.hospital : ''}
                </div>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
              <button className="btn-outline" onClick={closePreview}>Close</button>
            </div>
          </div>
        </div>
      )}

      <h2 style={{ marginTop: 32 }}>Your Share Tokens</h2>
      {tokens.length === 0 ? (
        <div className="empty">No shares yet. Generate one above.</div>
      ) : tokens.map(tk => {
        const isExpired = new Date(tk.expires_at) < new Date();
        const status = tk.revoked ? 'revoked' : isExpired ? 'expired' : 'active';
        const deletable = status === 'revoked' || status === 'expired';

        return (
          <div key={tk.id} className="report-row">
            <div>
              <strong>{tk.report_ids?.length || 0} report(s)</strong>
              <div style={{ fontSize: '0.85em', color: '#5b6478' }}>
                Created {new Date(tk.created_at).toLocaleString()}
                <br />
                Expires {new Date(tk.expires_at).toLocaleString()} • Uses: {tk.use_count}/{tk.max_uses}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span className={
                status === 'active' ? 'badge confirmed'
                : status === 'revoked' ? 'badge revoked'
                : 'badge expired'
              }>{status}</span>

              {status === 'active' && (
                <button className="btn-danger" onClick={() => revoke(tk.id)}>Revoke</button>
              )}

              {deletable && (
                <button
                  className="btn-danger"
                  onClick={() => deleteToken(tk.id)}
                  title="Delete this token permanently"
                  style={{
                    background: '#842029',
                    padding: '8px 12px',
                    fontWeight: 700,
                    minWidth: 40
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}