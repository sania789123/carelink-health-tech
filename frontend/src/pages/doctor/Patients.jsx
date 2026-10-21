import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client.js';
import { useLanguage } from '../../context/LanguageContext.jsx';
import Loading from '../../components/Loading.jsx';

export default function Patients() {
  const { t } = useLanguage();
  const [patients, setPatients] = useState(null);

  useEffect(() => { api.get('/doctors/me/patients').then(d => setPatients(d.patients)); }, []);
  if (!patients) return <Loading />;

  return (
    <div>
      <h1>{t('patients')}</h1>
      {patients.length === 0 ? <div className="empty">{t('no_data')}</div> : patients.map(p => (
        <Link key={p.id} to={'/doctor/patients/' + p.id} className="report-row" style={{textDecoration:'none', color:'inherit'}}>
          <div><strong>{p.full_name}</strong><br/><small>{p.email} {p.phone ? '• ' + p.phone : ''}</small></div>
          <span className="badge active">Access</span>
        </Link>
      ))}
    </div>
  );
}
