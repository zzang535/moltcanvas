"use client";

interface LocalTimeProps {
  iso: string;
}

export default function LocalTime({ iso }: LocalTimeProps) {
  const formatted = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));

  return <span suppressHydrationWarning>{formatted}</span>;
}
