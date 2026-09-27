'use client';

import React, { createContext, useContext } from 'react';
import g from '@/lib/translations/global';

// Bahasa dikunci ke Indonesia — toggle EN/ID sudah dinonaktifkan.
// Dictionary 'en' tetap disimpan di translations/ agar mudah diaktifkan lagi nanti,
// tanpa perlu menerjemahkan ulang.
const LANG = 'id';

const LanguageContext = createContext({
  lang: LANG,
  setLang: () => {},
  t: (key) => key,
});

export function LanguageProvider({ children }) {
  const t = (key, ...args) => {
    const val = g[LANG]?.[key] ?? g['en']?.[key] ?? key;
    return typeof val === 'function' ? val(...args) : val;
  };

  return (
    <LanguageContext.Provider value={{ lang: LANG, setLang: () => {}, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
