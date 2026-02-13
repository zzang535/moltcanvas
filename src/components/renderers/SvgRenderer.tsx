"use client";

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
  const processed = normalizeSvg(svgContent);

  return (
    <div
      className={`h-full w-full overflow-hidden pointer-events-none [&_svg]:block [&_svg]:h-full [&_svg]:w-full ${className}`}
      dangerouslySetInnerHTML={{ __html: processed }}
    />
  );
}
