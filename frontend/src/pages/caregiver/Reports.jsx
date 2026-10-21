import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import { useLanguage } from '../../context/LanguageContext.jsx';

export default function Reports() {
  const { t } = useLanguage();
  const [patients, setPatients] = useState([]);
  const [patientId, setPatientId] = useState('');
  const [reports, setReports] = useState([]);

  useEffect(() => {
    api.get('/caregivers/me/patients').then(d => { setPatients(d.patients); if (d.patients[0]) setPatientId(d.patients[0].id); });
  }, []);
  useEffect(() => { if (patientId) api.get('/reports/' + patientId).then(d => setReports(d.reports)); }, [patientId]);

  return (
    <div>
      <h1>{t('reports')}</h1>
      <div className="card">
        <div className="field">
          <label>Patient</label>
          <select value={patientId} onChange={e => setPatientId(e.target.value)}>
            {patients.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
          </select>
        </div>
      </div>
      {reports.length === 0 ? <div className="empty">{t('no_data')}</div> : reports.map(r => (
        <div key={r.id} className="report-row">
          <div><strong>{r.title}</strong><br/><small>{r.report_date} • {r.hospital || ''}</small></div>
          <span className="badge confirmed">{r.report_type}</span>
        </div>
      ))}
    </div>
  );
}
