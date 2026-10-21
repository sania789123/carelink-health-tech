import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client.js';
import Loading from '../components/Loading.jsx';

export default function PublicShare() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/qrshare/public/' + token)
      .then(d => setData(d))
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div className="auth-page"><Loading /></div>;

  if (err) {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <h1>⚠️ Link Not Available</h1>
          <p style={{ color: '#842029' }}>{err}</p>
          <Link className="btn-primary" to="/">Go Home</Link>
        </div>
      </div>
    );
  }

  const { patientName, summary, reports, expiresAt } = data;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>
      <div style={{
        background: '#fff',
        border: '1px solid #dde3ec',
        borderRadius: 12,
        padding: 24,
        marginBottom: 16
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5em' }}>🏥 CareLink — Shared Reports</h1>
            <p style={{ margin: '4px 0 0', color: '#5b6478' }}>
              Authorized by the patient · Time-limited access
            </p>
          </div>
          <div style={{ textAlign: 'right', fontSize: '0.85em', color: '#5b6478' }}>
            Expires<br />
            <strong>{new Date(expiresAt).toLocaleString()}</strong>
          </div>
        </div>
      </div>

      {/* Patient Summary */}
      {summary && (
        <div style={{
          background: '#eef4ff',
          border: '1px solid #0d6efd',
          borderRadius: 12,
          padding: 20,
          marginBottom: 16
        }}>
          <h2 style={{ marginTop: 0 }}>🧠 Patient Summary — {patientName}</h2>
          <p style={{ fontSize: '1.05em', fontWeight: 500 }}>{summary.headline}</p>

          {summary.abnormalValues?.length > 0 && (
            <>
              <h3 style={{ color: '#b02a37', marginTop: 16 }}>
                ⚠️ Values needing attention ({summary.abnormalValues.length})
              </h3>
              {summary.abnormalValues.map((v, i) => (
                <div key={i} style={{
                  padding: 10,
                  marginBottom: 6,
                  background: '#fff3cd',
                  color: '#664d03',
                  borderRadius: 8
                }}>
                  {v.friendly}
                </div>
              ))}
            </>
          )}

          {summary.normalValues?.length > 0 && (
            <>
              <h3 style={{ color: '#0f5132', marginTop: 16 }}>
                ✅ Normal values ({summary.normalValues.length})
              </h3>
              {summary.normalValues.map((v, i) => (
                <div key={i} style={{
                  padding: 10,
                  marginBottom: 6,
                  background: '#e7f5ee',
                  color: '#0f5132',
                  borderRadius: 8
                }}>
                  {v.friendly}
                </div>
              ))}
            </>
          )}

          <p style={{ fontSize: '0.85em', color: '#5b6478', marginTop: 16, marginBottom: 0 }}>
            ℹ️ {summary.disclaimer}
          </p>
        </div>
      )}

      {/* Authorized Reports */}
      <h2>Authorized Reports ({reports?.length || 0})</h2>
      {(!reports || reports.length === 0) ? (
        <div className="empty">No reports in this share.</div>
      ) : reports.map(r => (
        <div key={r.id} style={{
          background: '#fff',
          border: '1px solid #dde3ec',
          borderRadius: 10,
          padding: 16,
          marginBottom: 8
        }}>
          <strong>{r.title}</strong>
          <div style={{ fontSize: '0.85em', color: '#5b6478', marginTop: 4 }}>
            {r.report_date || 'No date'}
            {r.hospital ? ' • ' + r.hospital : ''}
            {r.doctor_name ? ' • ' + r.doctor_name : ''}
          </div>
        </div>
      ))}

      <div style={{
        marginTop: 24,
        padding: 12,
        background: '#f8fafd',
        border: '1px solid #dde3ec',
        borderRadius: 8,
        fontSize: '0.9em',
        color: '#5b6478',
        textAlign: 'center'
      }}>
        🔒 This share is time-limited and revocable by the patient.<br />
        <Link to="/" style={{ marginTop: 8, display: 'inline-block' }}>← Back to CareLink Home</Link>
      </div>
    </div>
  );
}