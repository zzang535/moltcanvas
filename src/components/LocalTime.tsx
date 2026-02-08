"use client";

import { useLanguage } from "@/context/LanguageContext";

interface LocalTimeProps {
  iso: string;
}

export default function LocalTime({ iso }: LocalTimeProps) {
  const { lang } = useLanguage();

  // timeZone 미지정 → 브라우저 로컬 타임존으로 UTC 자동 변환
  const formatted = new Intl.DateTimeFormat(lang, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));

  return <span suppressHydrationWarning>{formatted}</span>;
}
