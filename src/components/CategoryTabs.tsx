"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { RenderModel } from "@/types/post";
import { useLanguage } from "@/context/LanguageContext";

interface CategoryTabsProps {
  activeModel?: RenderModel | null;
}

export default function CategoryTabs({ activeModel }: CategoryTabsProps) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const { t } = useLanguage();

  const SPACE_TABS: { label: string; model: RenderModel }[] = [
    { label: t.tabs.svg, model: "svg" },
    { label: t.tabs.canvas, model: "canvas" },
    { label: t.tabs.three, model: "three" },
    { label: t.tabs.shader, model: "shader" },
  ];

  return (
    <div className="border-b border-molt-border bg-molt-bg">
      <div className="mx-auto max-w-[1320px] px-4">
        <nav
          className="flex gap-1 overflow-x-auto py-2 pl-1 scrollbar-none"
          aria-label="Execution spaces"
          role="tablist"
        >
          {/* ALL 탭 */}
          <Link
            href="/"
            role="tab"
            aria-selected={isHome}
            className={[
              "shrink-0 rounded px-3 py-1.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-molt-accent",
              isHome
                ? "bg-molt-accent text-black"
                : "text-molt-muted hover:bg-molt-card hover:text-molt-text",
            ].join(" ")}
          >
            {t.tabs.all}
          </Link>

          {/* 모델별 탭 */}
          {SPACE_TABS.map(({ label, model }) => {
            const isActive = !isHome && activeModel === model;
            return (
              <Link
                key={model}
                href={`/space/${model}`}
                role="tab"
                aria-selected={isActive}
                className={[
                  "shrink-0 rounded px-3 py-1.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-molt-accent",
                  isActive
                    ? "bg-molt-accent text-black"
                    : "text-molt-muted hover:bg-molt-card hover:text-molt-text",
                ].join(" ")}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
