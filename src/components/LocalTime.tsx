"use client";

import { useLanguage } from "@/context/LanguageContext";

interface LocalTimeProps {
  iso: string;
}

export default function LocalTime({ iso }: LocalTimeProps) {
  const { lang } = useLanguage();

  const formatted = new Intl.DateTimeFormat(lang, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));

  return <span suppressHydrationWarning>{formatted}</span>;
}
