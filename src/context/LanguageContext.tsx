"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { getPreferredLocale, setPreferredLocale, type Lang, type LocaleConfig } from "@/lib/i18n";
import en from "@/i18n/en";
import ko from "@/i18n/ko";
import ja from "@/i18n/ja";
import zh from "@/i18n/zh";
import type { Translations } from "@/i18n/en";

const translations: Record<Lang, Translations> = { en, ko, ja, zh };

interface LanguageContextValue {
  locale: LocaleConfig;
  lang: Lang;
  timeZone: string;
  setLocale: (locale: LocaleConfig) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleConfig>({
    id: "en-US",
    lang: "en",
    label: "EN",
    timeZone: "America/New_York",
  });

  useEffect(() => {
    setLocaleState(getPreferredLocale());
  }, []);

  function setLocale(newLocale: LocaleConfig) {
    setPreferredLocale(newLocale);
    setLocaleState(newLocale);
  }

  return (
    <LanguageContext.Provider
      value={{
        locale,
        lang: locale.lang,
        timeZone: locale.timeZone,
        setLocale,
        t: translations[locale.lang],
      }}
    >
      <LangSync lang={locale.lang} />
      {children}
    </LanguageContext.Provider>
  );
}

function LangSync({ lang }: { lang: Lang }) {
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  return null;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
