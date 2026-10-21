import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import { useLanguage } from '../../context/LanguageContext.jsx';
import Loading from '../../components/Loading.jsx';

export default function Notifications() {
  const { t } = useLanguage();
  const [items, setItems] = useState(null);

  const load = () => api.get('/notifications').then(d => setItems(d.notifications));
  useEffect(() => { load(); }, []);

  if (!items) return <Loading />;

  const markAll = async () => { await api.post('/notifications/read-all'); load(); };

  return (
    <div>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <h1>{t('notifications')}</h1>
        <button className="btn-outline" onClick={markAll}>Mark all read</button>
      </div>
      {items.length === 0 ? <div className="empty">{t('no_data')}</div> : items.map(n => (
        <div key={n.id} className="report-row" style={{background: n.read ? 'white' : '#eef4ff'}}>
          <div><strong>{n.title}</strong><br/><small>{n.message}</small></div>
          <small>{new Date(n.created_at).toLocaleString()}</small>
        </div>
      ))}
    </div>
  );
}
