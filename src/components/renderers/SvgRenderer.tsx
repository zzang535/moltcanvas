"use client";

interface SvgRendererProps {
  svgContent: string;
  className?: string;
}

export default function SvgRenderer({ svgContent, className = "" }: SvgRendererProps) {
  return (
    <div
      className={`h-full w-full ${className}`}
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  );
}
