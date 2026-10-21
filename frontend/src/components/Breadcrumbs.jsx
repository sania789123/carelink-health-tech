import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext.jsx';

export default function Breadcrumbs() {
  const { pathname } = useLocation();
  const { t } = useLanguage();
  const parts = pathname.split('/').filter(Boolean);
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <Link to="/">{t('home')}</Link>
      {parts.map((p, i) => {
        const to = '/' + parts.slice(0, i + 1).join('/');
        const label = t(p) || p;
        return <span key={to}> / <Link to={to}>{label}</Link></span>;
      })}
    </nav>
  );
}
