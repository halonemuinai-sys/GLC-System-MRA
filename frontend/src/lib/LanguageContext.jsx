'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import g from '@/lib/translations/global';

const LanguageContext = createContext({
  lang: 'en',
  setLang: () => {},
  t: (key, ...args) => key,
});

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState('en');

  useEffect(() => {
    const saved = localStorage.getItem('glc_lang') || 'en';
    setLangState(saved);
  }, []);

  const setLang = (l) => {
    setLangState(l);
    localStorage.setItem('glc_lang', l);
  };

  const t = (key, ...args) => {
    const val = g[lang]?.[key] ?? g['en']?.[key] ?? key;
    return typeof val === 'function' ? val(...args) : val;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
