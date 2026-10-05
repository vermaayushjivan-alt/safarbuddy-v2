'use client';

// MOBILE-02: tiny language preference store for the app shell.
// Saved in localStorage (try/catch: private mode / blocked storage must
// never break the page). First render is always English so server and
// client HTML match (no hydration mismatch); a saved choice is applied
// right after mount.

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { LANG_STORAGE_KEY, messages, type Lang, type MessageKey } from '@/lib/i18n/messages';

interface LanguageContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: MessageKey) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en');

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(LANG_STORAGE_KEY);
      if (saved === 'en' || saved === 'hi') {
        setLangState(saved);
        document.documentElement.lang = saved;
      }
    } catch {
      /* storage unavailable — stay on English */
    }
  }, []);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    document.documentElement.lang = next;
    try {
      window.localStorage.setItem(LANG_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo<LanguageContextType>(
    () => ({ lang, setLang, t: (key) => messages[lang][key] ?? messages.en[key] }),
    [lang, setLang]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextType {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    // Safe fallback if ever rendered outside the provider.
    return { lang: 'en', setLang: () => {}, t: (key) => messages.en[key] };
  }
  return ctx;
}
