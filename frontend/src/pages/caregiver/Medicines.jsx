import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import { useLanguage } from '../../context/LanguageContext.jsx';

export default function Medicines() {
  const { t } = useLanguage();
  const [patients, setPatients] = useState([]);
  const [patientId, setPatientId] = useState('');
  const [meds, setMeds] = useState([]);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [deletingId, setDeletingId] = useState('');

  const loadMeds = () => {
    if (!patientId) return;
    api.get('/medicines/' + patientId)
      .then(d => setMeds(d.medicines || []))
      .catch(e => setError(e.message));
  };

  useEffect(() => {
    api.get('/caregivers/me/patients').then(d => {
      setPatients(d.patients || []);
      if (d.patients?.[0]) setPatientId(d.patients[0].id);
    });
  }, []);

  useEffect(() => { loadMeds(); }, [patientId]);

  const deleteMed = async (med) => {
    const label = med.name || 'Unnamed Medicine';
    if (!confirm(`Delete "${label}"? This cannot be undone.`)) return;

    setDeletingId(med.id);
    setError(''); setMsg('');
    try {
      await api.del('/medicines/' + patientId + '/' + med.id);
      setMsg('Deleted: ' + label);
      setMeds(prev => prev.filter(x => x.id !== med.id));
      await loadMeds();
    } catch (e) {
      setError(e.message || 'Could not delete medicine.');
    } finally {
      setDeletingId('');
    }
  };

  return (
    <div>
      <h1>{t('medicines') || 'Medicines'}</h1>

      {error && <div className="error">{error}</div>}
      {msg && <div className="success">{msg}</div>}

      <div className="card">
        <div className="field">
          <label>Patient</label>
          <select value={patientId} onChange={e => setPatientId(e.target.value)}>
            {patients.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
          </select>
        </div>
      </div>

      {meds.length === 0 ? (
        <div className="empty">{t('no_data') || 'No medicines yet.'}</div>
      ) : meds.map(m => (
        <div key={m.id} className="report-row" style={{ alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <strong>{m.name}</strong> {m.dosage ? '— ' + m.dosage : ''}
            <br />
            <small>
              {m.frequency ? m.frequency + ' • ' : ''}
              {(m.times || []).join(', ')}
            </small>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span className={'badge ' + (m.confirmed ? 'confirmed' : 'pending')}>
              {m.confirmed ? 'Confirmed' : 'Pending'}
            </span>
            <button
              className="btn-danger"
              onClick={() => deleteMed(m)}
              disabled={deletingId === m.id}
              title="Delete this medicine"
              style={{ padding: '8px 12px', fontWeight: 700, minWidth: 36, background: '#842029' }}
            >
              {deletingId === m.id ? '…' : '✕'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}