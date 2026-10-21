import { useState, useRef, useEffect } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { api } from '../../api/client.js';
import { useLanguage } from '../../context/LanguageContext.jsx';

const SCANNER_ID = 'carelink-qr-scanner-region';

export default function QRAccess() {
  const { t, speak } = useLanguage();
  const [input, setInput] = useState('');
  const [result, setResult] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [openingId, setOpeningId] = useState('');

  // Camera scanner state
  const [scanning, setScanning] = useState(false);
  const [scanErr, setScanErr] = useState('');
  const scannerRef = useRef(null);

  const extractToken = (raw) => {
    if (!raw) return '';
    const trimmed = String(raw).trim();
    if (trimmed.includes('/share/')) return trimmed.split('/share/').pop().split(/[?#]/)[0];
    return trimmed;
  };

  const access = async (rawOverride) => {
    setErr(''); setResult(null); setBusy(true);
    const raw = rawOverride !== undefined ? rawOverride : input;
    const token = extractToken(raw);
    if (!token) {
      setErr('Please paste the share link or token.');
      setBusy(false);
      return;
    }
    try {
      const d = await api.get('/qrshare/access/' + token);
      setResult(d);
      speak('Access granted. ' + (d.reports?.length || 0) + ' reports available.');
      await stopScanner();
    } catch (e) {
      setErr(e.message || 'Could not access the share.');
    } finally {
      setBusy(false);
    }
  };

  const openReport = async (reportId, patientId, title) => {
    setOpeningId(reportId);
    setErr('');
    try {
      await api.openProtectedFile(
        '/reports/' + patientId + '/' + reportId + '/file',
        { filename: (title || 'report') + '.pdf' }
      );
    } catch (e) {
      setErr('Could not open report: ' + e.message);
    } finally {
      setOpeningId('');
    }
  };

  const readSummary = () => {
    if (!result?.summary) return;
    const parts = [result.summary.headline];
    for (const v of (result.summary.abnormalValues || [])) parts.push(v.friendly);
    speak(parts.join('. '));
  };

  // ---------------- Camera QR Scanner (html5-qrcode) ----------------

  const stopScanner = async () => {
    try {
      if (scannerRef.current) {
        const state = scannerRef.current.getState?.();
        // state 2 = SCANNING, 3 = PAUSED
        if (state === 2 || state === 3) {
          await scannerRef.current.stop();
        }
        try { scannerRef.current.clear(); } catch { /* ignore */ }
        scannerRef.current = null;
      }
    } catch (e) {
      console.warn('Stop scanner error:', e);
    } finally {
      setScanning(false);
    }
  };

  useEffect(() => {
    return () => { stopScanner(); };
  }, []);

  const startScanner = async () => {
    setScanErr('');
    setScanning(true);

    // Give React time to render the container div
    setTimeout(async () => {
      try {
        const scanner = new Html5Qrcode(SCANNER_ID, { verbose: false });
        scannerRef.current = scanner;

        const config = {
          fps: 10,
          qrbox: { width: 260, height: 260 },
          aspectRatio: 1.0,
          rememberLastUsedCamera: true
        };

        await scanner.start(
          { facingMode: 'environment' },
          config,
          (decodedText) => {
            // Success — decode the token and access records
            setInput(decodedText);
            access(decodedText);
          },
          () => { /* per-frame decode error — ignore */ }
        );
      } catch (e) {
        console.error('Camera start failed:', e);
        setScanErr(
          'Could not start the camera. Please allow camera permission, or paste the link below.'
        );
        setScanning(false);
      }
    }, 50);
  };

  return (
    <div>
      <h1>{t('qr_access') || 'QR Access'}</h1>
      <p style={{ color: '#5b6478', marginTop: 0 }}>
        Scan the patient's QR code with your camera, or paste the share link below.
      </p>

      {/* ---------------- Camera Scanner ---------------- */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <h3 style={{ margin: 0 }}>📷 Scan QR Code</h3>
          {!scanning ? (
            <button className="btn-primary" onClick={startScanner}>
              📷 Open Camera
            </button>
          ) : (
            <button className="btn-outline" onClick={stopScanner}>
              ✕ Stop Camera
            </button>
          )}
        </div>

        {/* This div is where html5-qrcode renders the video */}
        <div
          id={SCANNER_ID}
          style={{
            width: '100%',
            maxWidth: 500,
            margin: '12px auto',
            borderRadius: 12,
            overflow: 'hidden',
            background: scanning ? '#000' : 'transparent'
          }}
        />

        {scanning && (
          <p style={{ textAlign: 'center', color: '#5b6478' }}>
            Point the camera at the patient's QR code.
          </p>
        )}

        {scanErr && <div className="error" style={{ marginTop: 12 }}>{scanErr}</div>}
      </div>

      {/* ---------------- Manual Paste ---------------- */}
      <div className="card">
        <h3 style={{ marginTop: 0 }}>🔗 Or paste the share link / token</h3>
        <div className="field">
          <label>Share URL or Token</label>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="http://localhost:5173/share/AbCdEf…  or just the token"
          />
        </div>
        <button className="btn-primary" onClick={() => access()} disabled={busy}>
          {busy ? 'Verifying…' : 'Access Records'}
        </button>
      </div>

      {err && <div className="error">{err}</div>}

      {/* ---------------- Result View ---------------- */}
      {result && (
        <>
          <div className="success" style={{ marginTop: 16 }}>
            ✅ Access granted. {result.reports?.length || 0} report(s) authorized by the patient.
            {result.patientName ? ` Patient: ${result.patientName}.` : ''}
          </div>

          {result.summary && (
            <div className="card" style={{ background: '#eef4ff', borderColor: '#0d6efd', marginTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <h3 style={{ margin: 0 }}>🧠 Patient Summary</h3>
                <button className="btn-outline" onClick={readSummary}>🔊 Read Aloud</button>
              </div>

              <p style={{ fontSize: '1.05em', fontWeight: 500, marginTop: 12 }}>
                {result.summary.headline}
              </p>

              {result.summary.abnormalValues?.length > 0 && (
                <>
                  <h4 style={{ marginBottom: 6, color: '#b02a37', marginTop: 16 }}>
                    ⚠️ Values needing attention ({result.summary.abnormalValues.length})
                  </h4>
                  {result.summary.abnormalValues.map((v, i) => (
                    <div key={i} style={{
                      padding: 10, marginBottom: 6,
                      background: '#fff3cd', color: '#664d03',
                      borderRadius: 8, fontWeight: 500
                    }}>
                      {v.friendly}
                    </div>
                  ))}
                </>
              )}

              {result.summary.normalValues?.length > 0 && (
                <>
                  <h4 style={{ marginTop: 16, marginBottom: 6, color: '#0f5132' }}>
                    ✅ Normal values ({result.summary.normalValues.length})
                  </h4>
                  {result.summary.normalValues.map((v, i) => (
                    <div key={i} style={{
                      padding: 10, marginBottom: 6,
                      background: '#e7f5ee', color: '#0f5132',
                      borderRadius: 8, fontWeight: 500
                    }}>
                      {v.friendly}
                    </div>
                  ))}
                </>
              )}

              <p style={{ fontSize: '0.85em', color: '#5b6478', marginTop: 12, marginBottom: 0 }}>
                ℹ️ {result.summary.disclaimer}
              </p>
            </div>
          )}

          <h2 style={{ marginTop: 24 }}>Authorized Reports</h2>
          {(!result.reports || result.reports.length === 0) ? (
            <div className="empty">No reports in this share.</div>
          ) : result.reports.map(r => (
            <div key={r.id} className="report-row">
              <div>
                <strong>{r.title}</strong>
                <div style={{ fontSize: '0.85em', color: '#5b6478' }}>
                  {r.report_date || 'No date'}
                  {r.hospital ? ' • ' + r.hospital : ''}
                  {r.doctor_name ? ' • ' + r.doctor_name : ''}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span className="badge confirmed">{r.report_type || 'report'}</span>
                <button
                  className="btn-outline"
                  onClick={() => openReport(r.id, result.patientId, r.title)}
                  disabled={openingId === r.id}
                >
                  📄 {openingId === r.id ? 'Opening…' : 'Open'}
                </button>
              </div>
            </div>
          ))}

          <div style={{
            marginTop: 24, padding: 12,
            background: '#f8fafd', border: '1px solid #dde3ec',
            borderRadius: 8, fontSize: '0.9em', color: '#5b6478'
          }}>
            <strong>ℹ️ Note:</strong> You can only view the reports the patient has explicitly authorized.
            This access is time-limited and can be revoked by the patient at any moment.
          </div>
        </>
      )}
    </div>
  );
}