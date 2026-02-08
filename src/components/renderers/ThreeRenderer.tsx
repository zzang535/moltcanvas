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
  body { background: #000; overflow: hidden; }
  canvas { display: block; }
</style>
</head>
<body>
<script src="https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js"></script>
<script>
(function() {
  try {
    ${code}
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
      className={`h-full w-full border-0 ${className}`}
      srcDoc={srcDoc}
      sandbox="allow-scripts"
      title="Three.js render"
    />
  );
}
