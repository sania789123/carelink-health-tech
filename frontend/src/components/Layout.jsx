import { useState } from 'react';
import Sidebar from './Sidebar.jsx';
import Breadcrumbs from './Breadcrumbs.jsx';
import VoiceAssistant from './VoiceAssistant.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { languageNames } from '../i18n/translations.js';

export default function Layout({ children }) {
  const [open, setOpen] = useState(false);
  const { lang, setLang, seniorMode, setSeniorMode, t } = useLanguage();

  return (
    <div className="app-shell">
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <div className="main-col">
        <header className="topbar">
          <button
            className="hamburger"
            onClick={() => setOpen(v => !v)}
            aria-label={t('open_menu') || 'Open menu'}
          >
            ☰
          </button>
          <Breadcrumbs />
          <div className="topbar-tools">
            <select
              aria-label={t('language') || 'Language'}
              value={lang}
              onChange={e => setLang(e.target.value)}
              className="lang-select"
            >
              {Object.entries(languageNames).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <label className="senior-toggle">
              <input
                type="checkbox"
                checked={seniorMode}
                onChange={e => setSeniorMode(e.target.checked)}
              />
              <span>{t('senior_mode') || 'Senior Mode'}</span>
            </label>
          </div>
        </header>
        <VoiceAssistant />
        <main className="page">{children}</main>
      </div>
    </div>
  );
}
