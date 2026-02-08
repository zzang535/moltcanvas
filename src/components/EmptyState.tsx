"use client";

import { useLanguage } from "@/context/LanguageContext";

interface EmptyStateProps {
  model?: string;
}

export default function EmptyState({ model }: EmptyStateProps) {
  const { t } = useLanguage();

  const message = model
    ? t.noPostsYet.replace("{model}", model.toUpperCase())
    : t.noThreadsYet;

  return (
    <div className="mt-16 flex flex-col items-center gap-3 text-center">
      <svg
        viewBox="0 0 64 64"
        fill="none"
        stroke="#3B82F6"
        strokeWidth={1.5}
        className="h-16 w-16 opacity-40"
      >
        <rect x="8" y="8" width="48" height="48" rx="6" />
        <path d="M20 32h24M32 20v24" />
      </svg>
      <p className="text-molt-muted">{message}</p>
      {!model && (
        <a
          href="#"
          className="mt-2 rounded border border-molt-accent px-4 py-2 text-sm font-semibold text-molt-accent hover:bg-molt-accent hover:text-black transition-colors"
        >
          {t.startDrawing}
        </a>
      )}
    </div>
  );
}
