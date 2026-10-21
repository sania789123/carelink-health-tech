import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import { useLanguage } from '../../context/LanguageContext.jsx';

export default function CareCircle() {
  const { t } = useLanguage();
  const [patients, setPatients] = useState([]);
  const [patientId, setPatientId] = useState('');
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    api.get('/caregivers/me/patients').then(d => { setPatients(d.patients); if (d.patients[0]) setPatientId(d.patients[0].id); });
  }, []);
  useEffect(() => { if (patientId) api.get('/carecircle/' + patientId + '/tasks').then(d => setTasks(d.tasks)); }, [patientId]);

  const updateStatus = async (taskId, status) => {
    await api.put('/carecircle/' + patientId + '/tasks/' + taskId, { status });
    const d = await api.get('/carecircle/' + patientId + '/tasks');
    setTasks(d.tasks);
  };

  return (
    <div>
      <h1>{t('care_circle')}</h1>
      <div className="card">
        <div className="field">
          <label>Patient</label>
          <select value={patientId} onChange={e => setPatientId(e.target.value)}>
            {patients.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
          </select>
        </div>
      </div>
      {tasks.length === 0 ? <div className="empty">{t('no_data')}</div> : tasks.map(tk => (
        <div key={tk.id} className="report-row">
          <div><strong>{tk.title}</strong><br/><small>{tk.task_type} • due {tk.due_date || '—'}</small></div>
          <select value={tk.status} onChange={e => updateStatus(tk.id, e.target.value)}>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="missed">Missed</option>
          </select>
        </div>
      ))}
    </div>
  );
}
