"use client";

interface SvgRendererProps {
  svgContent: string;
  className?: string;
}

export default function SvgRenderer({ svgContent, className = "" }: SvgRendererProps) {
  // Inject preserveAspectRatio for center-crop behavior inside 1:1 container
  const processed = svgContent.replace(/<svg(\s)/i, '<svg preserveAspectRatio="xMidYMid slice"$1');
  return (
    <div
      className={`h-full w-full overflow-hidden ${className}`}
      dangerouslySetInnerHTML={{ __html: processed }}
    />
  );
}
