import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';

export default function Dashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [patients, setPatients] = useState([]);

  useEffect(() => { api.get('/caregivers/me/patients').then(d => setPatients(d.patients)); }, []);

  return (
    <div>
      <h1>{t('welcome')}, {user.full_name}</h1>
      <h2 style={{marginTop:24}}>Your Patients</h2>
      {patients.length === 0 ? <div className="empty">{t('no_data')}</div> : patients.map(p => (
        <div key={p.id} className="report-row">
          <div><strong>{p.full_name}</strong><br/><small>{p.email} • {p.permissions.join(', ')}</small></div>
        </div>
      ))}
    </div>
  );
}
