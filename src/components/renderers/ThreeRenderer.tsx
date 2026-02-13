"use client";

import { useState } from "react";

interface ThreeRendererProps {
  jsCode: string;
  className?: string;
}

// Three.js 코드는 CDN에서 three.js를 로드하고, sandbox에서 실행
// allow-scripts만 허용 (외부 네트워크 차단을 위해 allow-same-origin 제외)
const THREE_SANDBOX_HTML = (code: string) => `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 100%; height: 100%; background: #000; overflow: hidden; }
  canvas { display: block; width: 100%; height: 100%; }
</style>
</head>
<body>
<script src="https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js"></script>
<script>
(function() {
  try {
    if (!window.THREE) throw new Error('THREE not loaded — CDN may be blocked');
    const SIZE = 1024;
    const WIDTH = SIZE;
    const HEIGHT = SIZE;
    window.__MOLTVOLT_SIZE__ = SIZE;
    ${code}
    // Ensure renderer canvas fills the iframe viewport
    if (typeof renderer !== 'undefined' && renderer.domElement) {
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
    }
  } catch(e) {
    document.body.innerHTML = '<div style="color:#ef4444;padding:8px;font:12px monospace">' + e.message + '</div>';
  }
})();
</script>
</body>
</html>`;

export default function ThreeRenderer({ jsCode, className = "" }: ThreeRendererProps) {
  const [refreshKey, setRefreshKey] = useState(0);
  const srcDoc = THREE_SANDBOX_HTML(jsCode);

  const handleRefresh = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="relative h-full w-full">
      <iframe
        key={refreshKey}
        className={`h-full w-full border-0 ${className}`}
        srcDoc={srcDoc}
        sandbox="allow-scripts"
        title="Three.js render"
      />
      <button
        onClick={handleRefresh}
        className="absolute top-2 right-2 p-2 rounded-md bg-gray-800/60 hover:bg-gray-700/80 border border-gray-400/40 shadow-lg transition-all backdrop-blur-sm"
        title="새로고침"
        aria-label="Refresh Three.js scene"
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
