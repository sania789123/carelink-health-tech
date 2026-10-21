import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';
import Loading from '../../components/Loading.jsx';

export default function MedicineHistory() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [data, setData] = useState(null);

  useEffect(() => { api.get('/medicines/' + user.id + '/history').then(d => setData(d.history)); }, [user.id]);
  if (!data) return <Loading />;

  return (
    <div>
      <h1>{t('medicine_history')}</h1>
      {data.length === 0 ? <div className="empty">{t('no_data')}</div> : (
        <table>
          <thead><tr><th>Date/Time</th><th>Medicine</th><th>Status</th><th>Scheduled</th></tr></thead>
          <tbody>
            {data.map(h => (
              <tr key={h.id}>
                <td>{new Date(h.taken_at).toLocaleString()}</td>
                <td>{h.medicine_name}</td>
                <td><span className={'badge ' + h.status}>{h.status}</span></td>
                <td>{h.scheduled_time || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
