import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import { useLanguage } from '../../context/LanguageContext.jsx';

export default function CarePlans() {
  const { t } = useLanguage();
  const [plans, setPlans] = useState([]);
  const [patients, setPatients] = useState([]);
  const [form, setForm] = useState({ patientId:'', title:'', description:'', start_date:'', end_date:'' });

  const load = () => api.get('/doctors/me/care-plans').then(d => setPlans(d.plans));
  useEffect(() => {
    load();
    api.get('/doctors/me/patients').then(d => { setPatients(d.patients); if (d.patients[0]) setForm(f => ({ ...f, patientId: d.patients[0].id })); });
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.patientId || !form.title) return;
    await api.post('/carecircle/' + form.patientId + '/plans', {
      title: form.title, description: form.description, start_date: form.start_date, end_date: form.end_date
    });
    setForm({ ...form, title:'', description:'', start_date:'', end_date:'' });
    load();
  };
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div>
      <h1>{t('care_plans')}</h1>

      <form className="card" onSubmit={submit}>
        <h3>Create New Plan</h3>
        <div className="field">
          <label>Patient</label>
          <select value={form.patientId} onChange={set('patientId')}>
            {patients.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
          </select>
        </div>
        <div className="field"><label>Title *</label><input required value={form.title} onChange={set('title')} /></div>
        <div className="field"><label>Description</label><textarea value={form.description} onChange={set('description')} /></div>
        <div className="field"><label>Start Date</label><input type="date" value={form.start_date} onChange={set('start_date')} /></div>
        <div className="field"><label>End Date</label><input type="date" value={form.end_date} onChange={set('end_date')} /></div>
        <button className="btn-primary">Create Plan</button>
      </form>

      <h2>Your Plans</h2>
      {plans.length === 0 ? <div className="empty">{t('no_data')}</div> : plans.map(p => (
        <div key={p.id} className="card">
          <strong>{p.title}</strong> — {p.patient_name}
          <p>{p.description}</p>
          <small>{p.start_date} → {p.end_date} • {p.status}</small>
        </div>
      ))}
    </div>
  );
}
