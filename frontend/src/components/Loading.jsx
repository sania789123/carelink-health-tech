import { useLanguage } from '../context/LanguageContext.jsx';
export default function Loading() {
  const { t } = useLanguage();
  return <div className="loading" role="status" aria-live="polite">{t('loading')}</div>;
}
