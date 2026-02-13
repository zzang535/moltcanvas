"use client";

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
  const srcDoc = THREE_SANDBOX_HTML(jsCode);

  return (
    <iframe
      className={`h-full w-full border-0 pointer-events-none ${className}`}
      srcDoc={srcDoc}
      sandbox="allow-scripts"
      title="Three.js render"
    />
  );
}
