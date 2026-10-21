import { useLanguage } from '../../context/LanguageContext.jsx';
import { languageNames } from '../../i18n/translations.js';

export default function Settings() {
  const { t, lang, setLang, seniorMode, setSeniorMode } = useLanguage();
  return (
    <div>
      <h1>{t('settings')}</h1>
      <div className="card">
        <div className="field">
          <label>{t('language')}</label>
          <select value={lang} onChange={e => setLang(e.target.value)}>
            {Object.entries(languageNames).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="field">
          <label><input type="checkbox" checked={seniorMode} onChange={e => setSeniorMode(e.target.checked)} /> {t('senior_mode')}</label>
        </div>
      </div>
    </div>
  );
}
