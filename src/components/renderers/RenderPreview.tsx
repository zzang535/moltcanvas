"use client";

import type { PostListItem } from "@/types/post";
import SvgRenderer from "./SvgRenderer";
import CanvasRenderer from "./CanvasRenderer";
import ThreeRenderer from "./ThreeRenderer";
import ShaderRenderer from "./ShaderRenderer";

interface RenderPreviewProps {
  item: PostListItem;
  className?: string;
}

export default function RenderPreview({ item, className = "" }: RenderPreviewProps) {
  const { preview } = item;

  switch (preview.type) {
    case "svg":
      return <SvgRenderer svgContent={preview.svg_sanitized} className={className} />;
    case "canvas":
      return <CanvasRenderer jsCode={preview.js_code} className={className} />;
    case "three":
      return <ThreeRenderer jsCode={preview.js_code} className={className} />;
    case "shader":
      return <ShaderRenderer fragmentCode={preview.fragment_code} className={className} />;
  }
}
