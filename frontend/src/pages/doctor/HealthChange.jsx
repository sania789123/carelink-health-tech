import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import { useLanguage } from '../../context/LanguageContext.jsx';

export default function HealthChange() {
  const { t } = useLanguage();
  const [patients, setPatients] = useState([]);
  const [patientId, setPatientId] = useState('');
  const [reports, setReports] = useState([]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [result, setResult] = useState(null);

  useEffect(() => { api.get('/doctors/me/patients').then(d => { setPatients(d.patients); if (d.patients[0]) setPatientId(d.patients[0].id); }); }, []);
  useEffect(() => { if (patientId) api.get('/reports/' + patientId).then(d => setReports(d.reports)); }, [patientId]);

  const compare = async () => {
    if (!from || !to) return;
    try {
      const d = await api.get('/healthchange/' + patientId + '/compare?from=' + from + '&to=' + to);
      setResult(d);
    } catch (e) { alert(e.message); }
  };

  return (
    <div>
      <h1>{t('health_change')}</h1>
      <div className="card">
        <div className="field">
          <label>Patient</label>
          <select value={patientId} onChange={e => setPatientId(e.target.value)}>
            {patients.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Previous Report</label>
          <select value={from} onChange={e => setFrom(e.target.value)}>
            <option value="">— Select —</option>
            {reports.map(r => <option key={r.id} value={r.id}>{r.report_date} — {r.title}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Current Report</label>
          <select value={to} onChange={e => setTo(e.target.value)}>
            <option value="">— Select —</option>
            {reports.map(r => <option key={r.id} value={r.id}>{r.report_date} — {r.title}</option>)}
          </select>
        </div>
        <button className="btn-primary" onClick={compare}>{t('compare_reports')}</button>
      </div>

      {result && (
        <table>
          <thead><tr><th>Test</th><th>Previous</th><th>Current</th><th>Change</th><th>%</th></tr></thead>
          <tbody>
            {result.comparisons.map((c, i) => (
              <tr key={i}>
                <td>{c.test_name}</td>
                <td>{c.previous ?? '—'} {c.unit || ''}</td>
                <td>{c.current?.value ?? c.current ?? '—'}</td>
                <td>{c.absolute_change ?? (c.status === 'new' ? 'new' : '—')}</td>
                <td>{c.percent_change != null ? c.percent_change + '%' : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
