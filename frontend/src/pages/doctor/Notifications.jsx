import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import { useLanguage } from '../../context/LanguageContext.jsx';
import Loading from '../../components/Loading.jsx';

export default function Notifications() {
  const { t } = useLanguage();
  const [items, setItems] = useState(null);

  useEffect(() => { api.get('/notifications').then(d => setItems(d.notifications)); }, []);
  if (!items) return <Loading />;

  return (
    <div>
      <h1>{t('notifications')}</h1>
      {items.length === 0 ? <div className="empty">{t('no_data')}</div> : items.map(n => (
        <div key={n.id} className="report-row">
          <div><strong>{n.title}</strong><br/><small>{n.message}</small></div>
          <small>{new Date(n.created_at).toLocaleString()}</small>
        </div>
      ))}
    </div>
  );
}
