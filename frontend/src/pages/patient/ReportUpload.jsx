import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';

// ============ OCR PARSER (browser-side) ============

const KNOWN_TESTS = [
  'hemoglobin', 'haemoglobin',
  'rbc count', 'total rbc', 'rbc',
  'wbc count', 'total wbc', 'wbc',
  'platelet count', 'platelets', 'platelet',
  'mcv', 'mch', 'mchc', 'hematocrit', 'hct', 'pcv', 'rdw',
  'blood sugar (fasting)', 'blood sugar fasting', 'fasting sugar', 'fasting blood sugar',
  'blood sugar', 'blood glucose', 'glucose', 'fasting glucose', 'random sugar', 'pp sugar',
  'hba1c', 'glycated hemoglobin',
  'total cholesterol', 'cholesterol', 'ldl', 'hdl', 'vldl', 'triglycerides', 'triglyceride',
  'creatinine', 'urea', 'bun', 'uric acid', 'egfr', 'gfr',
  'tsh', 't3', 't4',
  'sgpt', 'sgot', 'alt', 'ast', 'alp', 'alkaline phosphatase',
  'bilirubin', 'albumin', 'total protein',
  'ferritin', 'iron', 'vitamin b12', 'vitamin d', 'calcium', 'phosphorus',
  'sodium', 'potassium', 'chloride',
  'esr', 'crp', 'psa'
];

const COMMON_TESTS = [
  { name: 'Hemoglobin', unit: 'g/dL', reference: '13-17' },
  { name: 'Blood Sugar (Fasting)', unit: 'mg/dL', reference: '70-100' },
  { name: 'Total Cholesterol', unit: 'mg/dL', reference: '<200' },
  { name: 'Creatinine', unit: 'mg/dL', reference: '0.7-1.3' },
  { name: 'TSH', unit: 'mIU/L', reference: '0.4-4.0' }
];

function parseNumeric(raw) {
  if (!raw) return null;
  let s = String(raw).trim().replace(/[^\d.,\-]/g, '');
  if (/^\d+,\d{1,2}$/.test(s)) s = s.replace(',', '.');
  s = s.replace(/,(?=\d{3})/g, '');
  const n = parseFloat(s);
  return isFinite(n) ? n : null;
}

function parseUnit(str) {
  if (!str) return '';
  const m = str.match(/\b(million\/µL|million\/uL|lakh\/µL|lakh\/uL|cells\/µL|cells\/uL|K\/µL|K\/uL|M\/µL|M\/uL|thousand\/µL|thousand\/uL|mg\/dL|mg\/dl|g\/dL|g\/dl|mg\/L|g\/L|mmol\/L|umol\/L|mIU\/L|uIU\/mL|ng\/mL|pg\/mL|ng\/dL|µg\/dL|mEq\/L|IU\/L|U\/L|fL|pg|%)\b/i);
  return m ? m[1] : '';
}

function prettify(name) {
  const map = {
    'hb': 'Hemoglobin',
    'rbc': 'RBC Count', 'rbc count': 'RBC Count', 'total rbc': 'RBC Count',
    'wbc': 'WBC Count', 'wbc count': 'WBC Count', 'total wbc': 'WBC Count',
    'mcv': 'MCV', 'mch': 'MCH', 'mchc': 'MCHC',
    'hct': 'Hematocrit', 'pcv': 'Packed Cell Volume', 'rdw': 'RDW',
    'tsh': 'TSH', 't3': 'T3', 't4': 'T4',
    'sgpt': 'SGPT', 'sgot': 'SGOT', 'alt': 'ALT', 'ast': 'AST', 'alp': 'ALP',
    'bun': 'BUN', 'egfr': 'eGFR', 'gfr': 'GFR',
    'hba1c': 'HbA1c',
    'ldl': 'LDL', 'hdl': 'HDL', 'vldl': 'VLDL',
    'esr': 'ESR', 'crp': 'CRP', 'psa': 'PSA'
  };
  if (map[name]) return map[name];
  return name.split(' ').map(w => w ? w[0].toUpperCase() + w.slice(1) : w).join(' ');
}

/**
 * Extract {value, unit, range} from a string that contains the numbers.
 * Assumes the FIRST number is the value; the range is the pattern "a-b" or "<N".
 */
function extractValueUnitRange(text) {
  if (!text) return null;

  // 1. Find the reference range FIRST (last a-b pattern, OR <N / >N)
  let range = '';
  let textWithoutRange = text;

  const allRanges = [...text.matchAll(/(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)/g)];
  if (allRanges.length > 0) {
    const last = allRanges[allRanges.length - 1];
    range = `${last[1]}-${last[2]}`;
    textWithoutRange = text.replace(last[0], ' ');
  } else {
    const lt = text.match(/<\s*=?\s*(\d+(?:\.\d+)?)/);
    if (lt) { range = `<${lt[1]}`; textWithoutRange = text.replace(lt[0], ' '); }
    else {
      const gt = text.match(/>\s*=?\s*(\d+(?:\.\d+)?)/);
      if (gt) { range = `>${gt[1]}`; textWithoutRange = text.replace(gt[0], ' '); }
    }
  }

  // 2. The value is the first number remaining
  const valueMatch = textWithoutRange.match(/(\d+(?:[.,]\d+)?)/);
  if (!valueMatch) return null;
  const value = parseNumeric(valueMatch[1]);
  if (value == null) return null;

  // 3. Unit is anything after the value
  const afterValue = textWithoutRange.slice(
    textWithoutRange.indexOf(valueMatch[1]) + valueMatch[1].length
  );
  const unit = parseUnit(afterValue);

  return { value, unit, range };
}

/**
 * Main parser: iterates lines, matches test names, extracts numbers
 * from the SAME line or the NEXT line (for multi-row tables).
 */
function parseTestsFromText(text) {
  if (!text) return [];

  const lines = text
    .split(/\r?\n/)
    .map(l => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  const tests = [];
  const seen = new Set();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lower = line.toLowerCase();

    // Find the longest matching test name
    let matched = null;
    for (const k of KNOWN_TESTS) {
      if (lower.includes(k) && (!matched || k.length > matched.length)) matched = k;
    }
    if (!matched) continue;
    if (seen.has(matched)) continue;

    // ---- Try to extract from THIS line first ----
    const idx = lower.indexOf(matched);
    let restOfLine = line.slice(idx + matched.length).trim().replace(/^[:\-–\s]+/, '');
    let result = extractValueUnitRange(restOfLine);

    // ---- If nothing found, look at the NEXT line ----
    if (!result) {
      for (let j = 1; j <= 2 && i + j < lines.length; j++) {
        const nextLine = lines[i + j];
        // Skip if the next line contains another test name
        if (KNOWN_TESTS.some(k => nextLine.toLowerCase().includes(k))) break;
        result = extractValueUnitRange(nextLine);
        if (result) break;
      }
    }

    // ---- If still nothing, look at the PREVIOUS line (OCR sometimes reads value before name) ----
    if (!result) {
      for (let j = 1; j <= 1 && i - j >= 0; j++) {
        const prevLine = lines[i - j];
        if (KNOWN_TESTS.some(k => prevLine.toLowerCase().includes(k))) break;
        result = extractValueUnitRange(prevLine);
        if (result) break;
      }
    }

    if (result) {
      tests.push({
        test_name: prettify(matched),
        value: String(result.value),
        unit: result.unit,
        reference_range: result.range
      });
      seen.add(matched);
    }
  }

  return tests;
}

// ============ COMPONENT ============

export default function ReportUpload() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const nav = useNavigate();

  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [meta, setMeta] = useState({
    title: '',
    report_type: 'lab',
    report_date: new Date().toISOString().slice(0, 10),
    hospital: '',
    doctor_name: '',
    notes: ''
  });
  const [tests, setTests] = useState([]);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [ocrStatus, setOcrStatus] = useState('');
  const [ocrProgress, setOcrProgress] = useState(0);
  const [rawText, setRawText] = useState('');
  const [uploadedId, setUploadedId] = useState(null);

  const set = (k) => (e) => setMeta(m => ({ ...m, [k]: e.target.value }));

  useEffect(() => {
    if (!file) { setPreviewUrl(''); return; }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowed.includes(f.type)) return setErr('Only PDF, JPG, JPEG, and PNG files are allowed.');
    if (f.size > 10 * 1024 * 1024) return setErr('File is too large. Maximum size is 10 MB.');
    setErr(''); setFile(f); setOcrStatus(''); setOcrProgress(0); setRawText('');
    if (!meta.title.trim()) {
      const clean = f.name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ').trim();
      setMeta(m => ({ ...m, title: clean || 'Uploaded Report' }));
    }
  };

  const addTestRow = () => setTests(prev => [...prev, { test_name: '', value: '', unit: '', reference_range: '' }]);
  const updateTest = (i, k, v) => setTests(prev => prev.map((row, idx) => idx === i ? { ...row, [k]: v } : row));
  const removeTest = (i) => setTests(prev => prev.filter((_, idx) => idx !== i));

  const submit = async (e) => {
    e.preventDefault();
    if (!file) return setErr('Please choose a file.');
    if (!meta.title.trim()) return setErr('Please enter a title.');

    setBusy(true); setErr(''); setOcrStatus('reading'); setOcrProgress(0);
    try {
      const fd = new FormData();
      fd.append('file', file);
      Object.entries(meta).forEach(([k, v]) => fd.append(k, v));
      const d = await api.upload('/reports/' + user.id + '/upload', fd);
      const reportId = d.id;
      setUploadedId(reportId);

      let extracted = [];
      if (file.type !== 'application/pdf') {
        try {
          const Tesseract = await import('tesseract.js');
          const result = await Tesseract.recognize(file, 'eng', {
            logger: (m) => {
              if (m.status === 'recognizing text') {
                setOcrProgress(Math.round(m.progress * 100));
              }
            }
          });
          const text = result.data.text || '';
          setRawText(text);
          extracted = parseTestsFromText(text);
        } catch (ocrErr) {
          console.error('Browser OCR failed:', ocrErr);
        }
      }

      const manualTests = tests.filter(t => t.test_name.trim());
      const allTests = [...manualTests, ...extracted];
      setTests(allTests);

      if (allTests.length > 0) {
        setOcrStatus('review');
      } else {
        setOcrStatus('empty');
      }
    } catch (e) {
      setErr(e.message);
      setOcrStatus('');
    } finally {
      setBusy(false);
    }
  };

  const saveAll = async () => {
    if (!uploadedId) return;
    setBusy(true);
    try {
      for (const row of tests) {
        if (!row.test_name.trim()) continue;
        await api.post('/reports/' + user.id + '/' + uploadedId + '/tests', {
          test_name: row.test_name.trim(),
          value: row.value !== '' ? Number(row.value) : null,
          unit: row.unit || null,
          reference_range: row.reference_range || null
        });
      }
      nav('/patient/reports/' + uploadedId);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const skipAndOpen = () => {
    if (uploadedId) nav('/patient/reports/' + uploadedId);
  };

  return (
    <div>
      <h1>{t('upload_report') || 'Upload Report'}</h1>
      {err && <div className="error">{err}</div>}

      {(ocrStatus === '' || ocrStatus === 'reading') && (
        <form className="card" onSubmit={submit}>
          <h3 style={{ marginTop: 0 }}>Step 1 — Choose the report</h3>
          <div className="field">
            <label>File (JPG, JPEG, PNG — max 10 MB)</label>
            <input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={handleFile} />
          </div>

          <div style={{ padding: 12, background: '#eef4ff', border: '1px solid #0d6efd', borderRadius: 8, marginBottom: 16, fontSize: '0.9em' }}>
            💡 <strong>Tip:</strong> Upload a clear photo or scan. The image will be read right here in your browser.
          </div>

          {previewUrl && file?.type?.startsWith('image/') && (
            <div style={{ marginBottom: 16, padding: 12, background: '#f8fafd', border: '1px solid #dde3ec', borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontSize: '0.85em', color: '#5b6478', marginBottom: 8 }}>Preview</div>
              <img src={previewUrl} alt="Uploaded preview" style={{ maxWidth: '100%', maxHeight: 300, borderRadius: 6 }} />
            </div>
          )}

          <h3 style={{ marginTop: 24 }}>Step 2 — Report details</h3>
          <div className="field">
            <label>Title *</label>
            <input required value={meta.title} onChange={set('title')} placeholder="e.g. Blood Test - April 2025" />
          </div>
          <div className="grid grid-2">
            <div className="field">
              <label>Report Type</label>
              <select value={meta.report_type} onChange={set('report_type')}>
                <option value="lab">Laboratory Report</option>
                <option value="handwritten">Handwritten Report</option>
                <option value="discharge">Discharge Summary</option>
                <option value="prescription">Prescription</option>
                <option value="imaging">Imaging</option>
              </select>
            </div>
            <div className="field">
              <label>Report Date</label>
              <input type="date" value={meta.report_date} onChange={set('report_date')} />
            </div>
            <div className="field">
              <label>Hospital / Lab</label>
              <input value={meta.hospital} onChange={set('hospital')} placeholder="e.g. City Lab" />
            </div>
            <div className="field">
              <label>Doctor's Name</label>
              <input value={meta.doctor_name} onChange={set('doctor_name')} placeholder="e.g. Dr. Mehta" />
            </div>
          </div>

          <button className="btn-primary" disabled={busy} type="submit" style={{ marginTop: 16 }}>
            {busy && ocrStatus === 'reading'
              ? `🔍 Reading image… ${ocrProgress}%`
              : 'Upload & Extract Values'}
          </button>

          {ocrStatus === 'reading' && (
            <div style={{ marginTop: 12 }}>
              <div style={{ height: 8, background: '#eef2f7', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: ocrProgress + '%', background: '#0d6efd', transition: 'width 0.2s' }} />
              </div>
              <div style={{ fontSize: '0.85em', color: '#5b6478', marginTop: 4 }}>
                Reading image in your browser… {ocrProgress}%
                {ocrProgress === 0 && ' (first run downloads OCR engine ~15 MB — one time only)'}
              </div>
            </div>
          )}
        </form>
      )}

      {ocrStatus === 'review' && (
        <div className="card" style={{ background: '#e7f5ee', borderColor: '#198754' }}>
          <h3 style={{ marginTop: 0 }}>✅ Extracted {tests.length} test value{tests.length > 1 ? 's' : ''}</h3>
          <p style={{ marginTop: 4 }}>Review and correct any values before saving.</p>

          <div style={{ marginTop: 12 }}>
            {tests.map((row, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                <input value={row.test_name} onChange={e => updateTest(i, 'test_name', e.target.value)} style={{ padding: 10, border: '2px solid #dde3ec', borderRadius: 6 }} />
                <input value={row.value} onChange={e => updateTest(i, 'value', e.target.value)} style={{ padding: 10, border: '2px solid #dde3ec', borderRadius: 6 }} />
                <input value={row.unit} onChange={e => updateTest(i, 'unit', e.target.value)} style={{ padding: 10, border: '2px solid #dde3ec', borderRadius: 6 }} />
                <input value={row.reference_range} onChange={e => updateTest(i, 'reference_range', e.target.value)} style={{ padding: 10, border: '2px solid #dde3ec', borderRadius: 6 }} />
                <button type="button" className="btn-danger" onClick={() => removeTest(i)} style={{ padding: '10px 12px' }}>✕</button>
              </div>
            ))}
          </div>

          <button type="button" className="btn-outline" onClick={addTestRow} style={{ marginTop: 8 }}>
            ➕ Add another test
          </button>

          <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
            <button className="btn-primary" onClick={saveAll} disabled={busy}>
              {busy ? 'Saving…' : '✓ Confirm & Save'}
            </button>
            <button className="btn-outline" onClick={skipAndOpen}>
              Skip — Open Report
            </button>
          </div>

          {rawText && (
            <details style={{ marginTop: 16 }}>
              <summary style={{ cursor: 'pointer', color: '#0d6efd', fontWeight: 600 }}>Show raw OCR text</summary>
              <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.85em', color: '#5b6478', background: '#fff', padding: 10, borderRadius: 6, marginTop: 8, maxHeight: 200, overflow: 'auto' }}>{rawText}</pre>
            </details>
          )}
        </div>
      )}

      {ocrStatus === 'empty' && (
        <div className="card" style={{ background: '#fff7e6', borderColor: '#f0c36d' }}>
          <h3 style={{ marginTop: 0 }}>⚠️ No test values found</h3>
          <p>The image was uploaded, but we couldn't automatically read any test values. Add them manually below.</p>

          {tests.map((row, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: 8, marginBottom: 8, alignItems: 'center' }}>
              <input value={row.test_name} onChange={e => updateTest(i, 'test_name', e.target.value)} placeholder="Test name" style={{ padding: 10, border: '2px solid #dde3ec', borderRadius: 6 }} />
              <input value={row.value} onChange={e => updateTest(i, 'value', e.target.value)} placeholder="Value" style={{ padding: 10, border: '2px solid #dde3ec', borderRadius: 6 }} />
              <input value={row.unit} onChange={e => updateTest(i, 'unit', e.target.value)} placeholder="Unit" style={{ padding: 10, border: '2px solid #dde3ec', borderRadius: 6 }} />
              <input value={row.reference_range} onChange={e => updateTest(i, 'reference_range', e.target.value)} placeholder="Reference" style={{ padding: 10, border: '2px solid #dde3ec', borderRadius: 6 }} />
              <button type="button" className="btn-danger" onClick={() => removeTest(i)} style={{ padding: '10px 12px' }}>✕</button>
            </div>
          ))}

          <button type="button" className="btn-outline" onClick={addTestRow} style={{ marginTop: 8 }}>
            ➕ Add Test Row
          </button>

          <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
            <button className="btn-primary" onClick={saveAll} disabled={busy || tests.length === 0}>
              {busy ? 'Saving…' : '✓ Save Tests'}
            </button>
            <button className="btn-outline" onClick={skipAndOpen}>
              Skip — Open Report
            </button>
          </div>

          {rawText && (
            <details style={{ marginTop: 16 }}>
              <summary style={{ cursor: 'pointer', color: '#0d6efd', fontWeight: 600 }}>Show raw OCR text</summary>
              <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.85em', color: '#5b6478', background: '#fff', padding: 10, borderRadius: 6, marginTop: 8, maxHeight: 200, overflow: 'auto' }}>{rawText}</pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
}