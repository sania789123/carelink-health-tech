import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';

export default function MedicineUpload() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const nav = useNavigate();
  const [file, setFile] = useState(null);
  const [fields, setFields] = useState({
    name: 'Unnamed Medicine',
    dosage: '',
    frequency: '',
    times: '08:00',
    duration_days: '',
    start_date: '',
    instructions: ''
  });
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const confirm = async (e) => {
    e.preventDefault();
    setErr('');
    const nameToSave = (fields.name || '').trim() || 'Unnamed Medicine';
    const timesArr = fields.times.split(',').map(s => s.trim()).filter(Boolean);
    try {
      await api.post('/medicines/' + user.id, {
        ...fields,
        name: nameToSave,
        times: timesArr,
        duration_days: fields.duration_days ? Number(fields.duration_days) : null,
        confirmed: true
      });
      setMsg('Medicine added.');
      nav('/patient/medicines');
    } catch (e) {
      setErr(e.message);
    }
  };

  const set = (k) => (e) => setFields({ ...fields, [k]: e.target.value });

  return (
    <div>
      <h1>{t('upload_prescription') || 'Upload Prescription'}</h1>
      {msg && <div className="success">{msg}</div>}
      {err && <div className="error">{err}</div>}

      <div className="card">
        <h3>Step 1 — Upload prescription image or PDF</h3>
        <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setFile(e.target.files[0])} />
        {file && <p>Selected: <strong>{file.name}</strong></p>}
        <p style={{ color: '#666', fontSize: '0.9em', marginTop: 8 }}>
          Automatic extraction is disabled in this demo. Enter details manually below.
        </p>
      </div>

      <div className="card">
        <h3>Step 2 — Confirm or correct details</h3>
        <form onSubmit={confirm}>
          <div className="field">
            <label>Medicine Name (optional)</label>
            <input
              value={fields.name}
              onChange={set('name')}
              placeholder="e.g. Metformin (leave blank if unknown)"
            />
          </div>

          <div className="field">
            <label>Dosage</label>
            <input value={fields.dosage} onChange={set('dosage')} placeholder="500 mg" />
          </div>

          <div className="field">
            <label>Frequency</label>
            <input value={fields.frequency} onChange={set('frequency')} placeholder="Twice daily" />
          </div>

          <div className="field">
            <label>Times (comma separated)</label>
            <input value={fields.times} onChange={set('times')} placeholder="08:00,20:00" />
          </div>

          <div className="field">
            <label>Duration (days)</label>
            <input type="number" value={fields.duration_days} onChange={set('duration_days')} />
          </div>

          <div className="field">
            <label>Start Date</label>
            <input type="date" value={fields.start_date} onChange={set('start_date')} />
          </div>

          <div className="field">
            <label>Instructions</label>
            <textarea value={fields.instructions} onChange={set('instructions')} />
          </div>

          <button className="btn-primary">{t('save') || 'Save'} &amp; Activate Reminders</button>
        </form>
      </div>
    </div>
  );
}