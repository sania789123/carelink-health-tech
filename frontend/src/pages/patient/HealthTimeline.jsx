import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';
import Loading from '../../components/Loading.jsx';

export default function HealthTimeline() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [timeline, setTimeline] = useState(null);

  useEffect(() => { api.get('/healthchange/' + user.id + '/timeline').then(d => setTimeline(d.timeline)); }, [user.id]);
  if (!timeline) return <Loading />;

  return (
    <div>
      <h1>{t('health_timeline')}</h1>
      {timeline.length === 0 ? <div className="empty">{t('no_data')}</div> : timeline.map(r => (
        <Link key={r.id} to={'/patient/reports/' + r.id} className="report-row" style={{textDecoration:'none', color:'inherit'}}>
          <div>
            <strong>{r.report_date || '—'}</strong> — {r.title}
            <br/><small>{r.hospital || ''} {r.doctor_name ? '• ' + r.doctor_name : ''}</small>
          </div>
          <span className="badge confirmed">{r.report_type}</span>
        </Link>
      ))}
    </div>
  );
}
