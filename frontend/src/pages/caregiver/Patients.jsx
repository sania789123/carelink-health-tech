import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import { useLanguage } from '../../context/LanguageContext.jsx';
import Loading from '../../components/Loading.jsx';

export default function Patients() {
  const { t } = useLanguage();
  const [patients, setPatients] = useState(null);

  useEffect(() => { api.get('/caregivers/me/patients').then(d => setPatients(d.patients)); }, []);
  if (!patients) return <Loading />;

  return (
    <div>
      <h1>{t('patients')}</h1>
      {patients.length === 0 ? <div className="empty">{t('no_data')}</div> : patients.map(p => (
        <div key={p.id} className="report-row">
          <div><strong>{p.full_name}</strong><br/><small>{p.email}</small></div>
        </div>
      ))}
    </div>
  );
}
