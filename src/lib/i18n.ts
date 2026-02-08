export const SUPPORTED_LANGS = ["en", "ko", "ja", "zh"] as const;
export type Lang = (typeof SUPPORTED_LANGS)[number];

const STORAGE_KEY = "molt_lang";

function normalizeLang(lang: string): Lang {
  const prefix = lang.split("-")[0].toLowerCase();
  if ((SUPPORTED_LANGS as readonly string[]).includes(prefix)) {
    return prefix as Lang;
  }
  return "en";
}

export function getPreferredLanguage(): Lang {
  if (typeof window === "undefined") return "en";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && (SUPPORTED_LANGS as readonly string[]).includes(stored)) {
    return stored as Lang;
  }
  const browser = navigator.language || (navigator.languages?.[0] ?? "en");
  return normalizeLang(browser);
}

export function setPreferredLanguage(lang: Lang): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, lang);
}
