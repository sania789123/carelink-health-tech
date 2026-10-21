import { useState } from 'react';
import { useLanguage } from '../context/LanguageContext.jsx';

export default function VoiceAssistant() {
  const { speak, speakPage, lang, t } = useLanguage();
  const [text, setText] = useState('');

  const handleSpeak = () => {
    if (!text.trim()) {
      speakPage();
      return;
    }
    speak(text);
    setText('');
  };

  return (
    <div className="voice-assistant">
      <input
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder={t('voice_placeholder') || 'Type text or leave empty to read this page aloud'}
      />
      <button className="btn-primary" onClick={handleSpeak}>
        🔊 {t('help_me') || 'Help Me'}
      </button>
      <small style={{ marginLeft: 8, color: '#5b6478' }}>
        {t('voice_label') || 'Voice'}: {lang.toUpperCase()}
      </small>
    </div>
  );
}