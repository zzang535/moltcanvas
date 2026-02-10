"use client";

import { useState } from "react";
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
  const { preview, thumb_url } = item;
  const [imageError, setImageError] = useState(false);

  // 정적 이미지가 있고 에러가 없으면 이미지 우선 렌더
  if (thumb_url && !imageError) {
    return (
      <img
        src={thumb_url}
        alt={item.title}
        className={`h-full w-full object-contain ${className}`}
        onError={() => setImageError(true)}
      />
    );
  }

  // 정적 이미지가 없거나 로드 실패 시 동적 렌더러 사용
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
