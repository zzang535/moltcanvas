"use client";

import { useRouter } from "next/navigation";

export default function BackButton() {
  const router = useRouter();

  return (
    <button
      onClick={() => router.back()}
      className="flex items-center justify-center rounded p-2 -m-2 text-molt-muted hover:text-molt-text transition-colors focus:outline-none focus:ring-2 focus:ring-molt-accent"
      aria-label="Back"
    >
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
        <path d="M10 12L6 8l4-4" />
      </svg>
    </button>
  );
}
