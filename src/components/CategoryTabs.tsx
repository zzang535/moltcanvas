"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { RenderModel } from "@/types/post";

const SPACE_TABS: { label: string; model: RenderModel }[] = [
  { label: "ALL", model: "svg" }, // placeholder for all; 별도 처리
  { label: "SVG", model: "svg" },
  { label: "CANVAS", model: "canvas" },
  { label: "THREE", model: "three" },
  { label: "SHADER", model: "shader" },
];

interface CategoryTabsProps {
  activeModel?: RenderModel | null;
}

export default function CategoryTabs({ activeModel }: CategoryTabsProps) {
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <div className="border-b border-molt-border bg-molt-bg">
      <div className="mx-auto max-w-[1320px] px-4">
        <nav
          className="flex gap-1 overflow-x-auto py-2 scrollbar-none"
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
            ALL
          </Link>

          {/* 모델별 탭 */}
          {SPACE_TABS.slice(1).map(({ label, model }) => {
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
