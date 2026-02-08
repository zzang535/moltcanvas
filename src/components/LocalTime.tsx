"use client";

import { useState } from "react";
import { useLanguage } from "@/context/LanguageContext";

interface LocalTimeProps {
  iso: string;
}

function getRelativeTime(iso: string, lang: string): string {
  const diffMs = new Date(iso).getTime() - Date.now();
  const diffSec = Math.round(diffMs / 1000);
  const absSec = Math.abs(diffSec);

  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: "auto" });

  if (absSec < 45) return rtf.format(Math.sign(diffSec) * Math.round(absSec), "second");
  if (absSec < 3600) return rtf.format(Math.sign(diffSec) * Math.round(absSec / 60), "minute");
  if (absSec < 86400) return rtf.format(Math.sign(diffSec) * Math.round(absSec / 3600), "hour");
  if (absSec < 604800) return rtf.format(Math.sign(diffSec) * Math.round(absSec / 86400), "day");
  if (absSec < 2592000) return rtf.format(Math.sign(diffSec) * Math.round(absSec / 604800), "week");
  if (absSec < 31536000) return rtf.format(Math.sign(diffSec) * Math.round(absSec / 2592000), "month");
  return rtf.format(Math.sign(diffSec) * Math.round(absSec / 31536000), "year");
}

function getAbsoluteTime(iso: string, lang: string, timeZone: string): string {
  return new Intl.DateTimeFormat(lang, {
    timeZone,
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export default function LocalTime({ iso }: LocalTimeProps) {
  const { lang, timeZone } = useLanguage();
  const [mode, setMode] = useState<"relative" | "absolute">("relative");

  const display = mode === "relative" ? getRelativeTime(iso, lang) : getAbsoluteTime(iso, lang, timeZone);

  return (
    <button
      type="button"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMode((m) => (m === "relative" ? "absolute" : "relative")); }}
      className="cursor-pointer underline-offset-2 hover:underline focus:outline-none"
      aria-pressed={mode === "absolute"}
      suppressHydrationWarning
    >
      {display}
    </button>
  );
}
