import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';

export default function Dashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [patients, setPatients] = useState([]);
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    api.get('/doctors/me/patients').then(d => setPatients(d.patients));
    api.get('/doctors/me/tasks').then(d => setTasks(d.tasks));
  }, []);

  return (
    <div>
      <h1>{t('welcome')}, {user.full_name}</h1>

      <div className="grid grid-3" style={{marginTop:20}}>
        <div className="stat-card"><div className="stat-value">{patients.length}</div><div className="stat-label">{t('patients')}</div></div>
        <div className="stat-card"><div className="stat-value">{tasks.length}</div><div className="stat-label">{t('follow_ups')}</div></div>
      </div>

      <h2 style={{marginTop:32}}>Your Patients</h2>
      {patients.length === 0 ? <div className="empty">{t('no_data')}</div> : patients.map(p => (
        <Link key={p.id} to={'/doctor/patients/' + p.id} className="report-row" style={{textDecoration:'none', color:'inherit'}}>
          <div><strong>{p.full_name}</strong><br/><small>{p.email}</small></div>
          <span className="badge active">View</span>
        </Link>
      ))}

      <h2 style={{marginTop:32}}>{t('follow_ups')}</h2>
      {tasks.length === 0 ? <div className="empty">{t('no_data')}</div> : tasks.map(tk => (
        <div key={tk.id} className="report-row">
          <div><strong>{tk.title}</strong><br/><small>{tk.patient_name} • due {tk.due_date || '—'}</small></div>
          <span className={'badge ' + tk.status}>{tk.status}</span>
        </div>
      ))}
    </div>
  );
}
