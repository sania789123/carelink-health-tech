import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../api/client.js';
import { useLanguage } from '../../context/LanguageContext.jsx';
import Loading from '../../components/Loading.jsx';

export default function PatientDetail() {
  const { patientId } = useParams();
  const { t } = useLanguage();
  const [profile, setProfile] = useState(null);
  const [reports, setReports] = useState([]);
  const [plans, setPlans] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [checkins, setCheckins] = useState([]);

  useEffect(() => {
    api.get('/patients/' + patientId + '/profile').then(d => setProfile(d.profile));
    api.get('/reports/' + patientId).then(d => setReports(d.reports));
    api.get('/carecircle/' + patientId + '/plans').then(d => setPlans(d.plans));
    api.get('/carecircle/' + patientId + '/tasks').then(d => setTasks(d.tasks));
    api.get('/recoverytrack/' + patientId + '/checkins').then(d => setCheckins(d.checkins));
  }, [patientId]);

  if (!profile) return <Loading />;

  return (
    <div>
      <Link to="/doctor/patients">← Back</Link>
      <h1>{profile.full_name}</h1>
      <div className="card">
        <p><strong>Email:</strong> {profile.email}</p>
        <p><strong>Phone:</strong> {profile.phone || '—'}</p>
        <p><strong>Blood Group:</strong> {profile.blood_group || '—'}</p>
        <p><strong>Emergency Contact:</strong> {profile.emergency_contact || '—'}</p>
      </div>

      <h2>Reports ({reports.length})</h2>
      {reports.slice(0, 5).map(r => (
        <div key={r.id} className="report-row">
          <div><strong>{r.title}</strong><br/><small>{r.report_date || ''}</small></div>
          <span className="badge confirmed">{r.report_type}</span>
        </div>
      ))}

      <h2 style={{marginTop:24}}>Care Plans ({plans.length})</h2>
      {plans.map(p => (
        <div key={p.id} className="card">
          <strong>{p.title}</strong>
          <p>{p.description}</p>
        </div>
      ))}

      <h2 style={{marginTop:24}}>Tasks ({tasks.length})</h2>
      {tasks.slice(0, 10).map(tk => (
        <div key={tk.id} className="report-row">
          <div><strong>{tk.title}</strong></div>
          <span className={'badge ' + tk.status}>{tk.status}</span>
        </div>
      ))}

      <h2 style={{marginTop:24}}>Recent Check-ins ({checkins.length})</h2>
      {checkins.slice(0, 5).map(c => (
        <div key={c.id} className="report-row">
          <div><strong>{c.check_date}</strong><br/><small>Symptoms: {c.symptoms.join(', ') || 'none'} • Adherence: {c.adherence}</small></div>
        </div>
      ))}
    </div>
  );
}
