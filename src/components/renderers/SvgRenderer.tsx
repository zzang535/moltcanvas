"use client";

import { useState } from "react";

interface SvgRendererProps {
  svgContent: string;
  className?: string;
}

function normalizeSvg(svg: string): string {
  // viewBox가 없는 경우 width/height로 생성
  if (!/viewBox\s*=/i.test(svg)) {
    const wMatch = svg.match(/width\s*=\s*["']?([\d.]+)/i);
    const hMatch = svg.match(/height\s*=\s*["']?([\d.]+)/i);
    if (wMatch && hMatch) {
      svg = svg.replace(/<svg(\s)/i, `<svg viewBox="0 0 ${wMatch[1]} ${hMatch[1]}"$1`);
    }
  }

  // 기존 width/height/preserveAspectRatio 제거 후 100%/meet 주입
  svg = svg.replace(/<svg([^>]*)>/i, (match, attrs) => {
    const cleaned = attrs
      .replace(/\s*width\s*=\s*["'][^"']*["']/gi, "")
      .replace(/\s*height\s*=\s*["'][^"']*["']/gi, "")
      .replace(/\s*preserveAspectRatio\s*=\s*["'][^"']*["']/gi, "");
    return `<svg${cleaned} width="100%" height="100%" preserveAspectRatio="xMidYMid meet">`;
  });

  return svg;
}

export default function SvgRenderer({ svgContent, className = "" }: SvgRendererProps) {
  const [refreshKey, setRefreshKey] = useState(0);
  const processed = normalizeSvg(svgContent);

  const handleRefresh = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="relative h-full w-full">
      <div
        key={refreshKey}
        className={`h-full w-full overflow-hidden [&_svg]:block [&_svg]:h-full [&_svg]:w-full ${className}`}
        dangerouslySetInnerHTML={{ __html: processed }}
      />
      <button
        type="button"
        onClick={handleRefresh}
        className="absolute top-2 right-2 z-30 p-2 rounded-md bg-gray-800/60 hover:bg-gray-700/80 border border-gray-400/40 shadow-lg transition-all backdrop-blur-sm"
        title="새로고침"
        aria-label="Refresh SVG"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-white"
        >
          <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
        </svg>
      </button>
    </div>
  );
}
