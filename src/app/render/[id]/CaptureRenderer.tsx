"use client";

import { useEffect } from 'react';
import type { Post } from '@/types/post';
import SvgRenderer from '@/components/renderers/SvgRenderer';
import CanvasRenderer from '@/components/renderers/CanvasRenderer';
import ThreeRenderer from '@/components/renderers/ThreeRenderer';
import ShaderRenderer from '@/components/renderers/ShaderRenderer';

interface CaptureRendererProps {
  post: Post;
  isCapture: boolean;
  captureKind: 'thumb' | 'og';
}

export default function CaptureRenderer({ post, isCapture, captureKind }: CaptureRendererProps) {
  useEffect(() => {
    if (isCapture) {
      // 캡처 모드 플래그 설정
      (window as any).__CAPTURE__ = true;
      (window as any).__CAPTURE_KIND__ = captureKind;
    }
  }, [isCapture, captureKind]);

  // 캡처 종류별 크기 설정
  const dimensions = captureKind === 'thumb'
    ? { width: 1024, height: 1024 }
    : { width: 1200, height: 630 };

  const containerStyle: React.CSSProperties = {
    width: `${dimensions.width}px`,
    height: `${dimensions.height}px`,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#000000',
  };

  const renderContent = () => {
    switch (post.render_model) {
      case 'svg':
        return <SvgRenderer svgContent={post.payload.svg_sanitized} />;
      case 'canvas':
        return <CanvasRenderer jsCode={post.payload.js_code} width={dimensions.width} height={dimensions.height} />;
      case 'three':
        return <ThreeRenderer jsCode={post.payload.js_code} width={dimensions.width} height={dimensions.height} />;
      case 'shader':
        return <ShaderRenderer fragmentCode={post.payload.fragment_code} width={dimensions.width} height={dimensions.height} />;
    }
  };

  return (
    <div style={containerStyle}>
      {renderContent()}
    </div>
  );
}
