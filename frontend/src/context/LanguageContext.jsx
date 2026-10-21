import { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../i18n/translations.js';

const LanguageContext = createContext(null);

// Map app language -> Google Translate TTS language code
const GOOGLE_TTS_LANG = {
  en: 'en',
  hi: 'hi',
  te: 'te',
  ur: 'ur'
};

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(localStorage.getItem('carelink_lang') || 'en');
  const [seniorMode, setSeniorMode] = useState(localStorage.getItem('carelink_senior') === '1');
  const [voices, setVoices] = useState([]);
  const [currentAudio, setCurrentAudio] = useState(null);

  // Load browser voices (used only for English)
  useEffect(() => {
    if (!('speechSynthesis' in window)) return;

    const loadVoices = () => {
      const list = window.speechSynthesis.getVoices() || [];
      if (list.length > 0) {
        setVoices(list);
        console.log('[Voice] Loaded', list.length, 'browser voices');
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    const t1 = setTimeout(loadVoices, 300);
    const t2 = setTimeout(loadVoices, 1000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  useEffect(() => { localStorage.setItem('carelink_lang', lang); }, [lang]);
  useEffect(() => {
    localStorage.setItem('carelink_senior', seniorMode ? '1' : '0');
    document.body.classList.toggle('senior-mode', seniorMode);
  }, [seniorMode]);

  const t = (key) => (translations[lang] && translations[lang][key]) || translations.en[key] || key;

  // ---- ENGLISH: use browser speech synthesis ----
  const speakEnglish = (text) => {
    if (!('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(String(text));
      u.lang = 'en-IN';
      u.rate = 0.95;
      u.pitch = 1;
      u.volume = 1;

      // Prefer an Indian English voice if available
      const enVoice = voices.find(v => v.lang === 'en-IN') || voices.find(v => v.lang.startsWith('en'));
      if (enVoice) u.voice = enVoice;

      setTimeout(() => window.speechSynthesis.speak(u), 80);
    } catch (err) {
      console.error('[Voice] English speak failed:', err);
    }
  };

  // ---- HINDI / TELUGU / URDU: use Google Translate TTS via audio ----
  const speakGoogleTts = (text, langCode) => {
    try {
      // Stop any browser speech that might be running
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();

      // Stop any previous Google TTS audio
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      }

      const langPair = GOOGLE_TTS_LANG[langCode] || 'en';
      // Google TTS is limited to ~200 chars per request, so split long text
      const chunks = splitText(String(text), 190);
      let index = 0;

      const playNext = () => {
        if (index >= chunks.length) return;

        const chunk = chunks[index];
        const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=${langPair}&client=tw-ob`;

        const audio = new Audio(url);
        audio.crossOrigin = 'anonymous';
        setCurrentAudio(audio);
        audio.onended = () => {
          index++;
          playNext();
        };
        audio.onerror = () => {
          console.error('[Voice] Google TTS failed for chunk:', chunk.slice(0, 30));
          // Fallback to browser English speech
          if (index === 0) {
            console.warn('[Voice] Falling back to browser speech.');
            speakEnglish(chunk);
          }
          index++;
          playNext();
        };

        audio.play().catch(err => {
          console.error('[Voice] Audio play error:', err.message);
          // Fallback: try browser speech
          if (index === 0) speakEnglish(chunk);
          index++;
          playNext();
        });
      };

      playNext();
    } catch (err) {
      console.error('[Voice] Google TTS failed:', err);
    }
  };

  // Helper: split long text into chunks under a max length
  function splitText(text, maxLen) {
    if (text.length <= maxLen) return [text];
    const chunks = [];
    const sentences = text.split(/(?<=[.!?।॥؟])\s+/);
    let current = '';
    for (const s of sentences) {
      if ((current + ' ' + s).trim().length <= maxLen) {
        current = (current + ' ' + s).trim();
      } else {
        if (current) chunks.push(current);
        // If a single sentence is too long, split by words
        if (s.length > maxLen) {
          const words = s.split(/\s+/);
          let buf = '';
          for (const w of words) {
            if ((buf + ' ' + w).trim().length <= maxLen) buf = (buf + ' ' + w).trim();
            else { if (buf) chunks.push(buf); buf = w; }
          }
          if (buf) chunks.push(buf);
        } else {
          current = s;
        }
      }
    }
    if (current) chunks.push(current);
    return chunks.length ? chunks : [text];
  }

  // ---- PUBLIC speak() — dispatches to the right engine ----
  const speak = (text) => {
    if (!text) return;

    const trimmed = String(text).trim();
    if (!trimmed) return;

    if (lang === 'en') {
      speakEnglish(trimmed);
    } else {
      speakGoogleTts(trimmed, lang);
    }
  };

  const speakPage = () => {
    const main = document.querySelector('main');
    if (!main) return;
    const text = main.innerText || '';
    if (!text.trim()) return;
    speak(text);
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, seniorMode, setSeniorMode, speak, speakPage, voices }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);