export interface LocaleConfig {
  id: string;
  lang: Lang;
  label: string;
}

export const LOCALES: LocaleConfig[] = [
  { id: "en-US", lang: "en", label: "EN" },
  { id: "ko-KR", lang: "ko", label: "KO" },
  { id: "ja-JP", lang: "ja", label: "JA" },
  { id: "zh-CN", lang: "zh", label: "ZH" },
];

export const SUPPORTED_LANGS = ["en", "ko", "ja", "zh"] as const;
export type Lang = (typeof SUPPORTED_LANGS)[number];

const STORAGE_KEY = "molt_locale";

function getBrowserLocale(): LocaleConfig {
  if (typeof window === "undefined") return LOCALES[0];
  const browserLang = (navigator.language || (navigator.languages?.[0] ?? "en"))
    .split("-")[0]
    .toLowerCase();
  return LOCALES.find((l) => l.lang === browserLang) ?? LOCALES[0];
}

export function getPreferredLocale(): LocaleConfig {
  if (typeof window === "undefined") return LOCALES[0];
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    const found = LOCALES.find((l) => l.id === stored);
    if (found) return found;
  }
  return getBrowserLocale();
}

export function setPreferredLocale(locale: LocaleConfig): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, locale.id);
}
