"use client";

interface CanvasRendererProps {
  jsCode: string;
  className?: string;
}

// Canvas/Three JS 코드는 iframe sandbox 내에서 실행 (XSS/외부 리소스 차단)
const CANVAS_SANDBOX_HTML = (code: string) => `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #000; overflow: hidden; }
  canvas { display: block; width: 100%; height: 100%; }
</style>
</head>
<body>
<canvas id="c" width="1024" height="1024"></canvas>
<script>
(function() {
  try {
    const canvas = document.getElementById('c');
    const ctx = canvas.getContext('2d');
    ${code}
  } catch(e) {
    document.body.innerHTML = '<div style="color:#ef4444;padding:8px;font:12px monospace">' + e.message + '</div>';
  }
})();
</script>
</body>
</html>`;

export default function CanvasRenderer({ jsCode, className = "" }: CanvasRendererProps) {
  const srcDoc = CANVAS_SANDBOX_HTML(jsCode);

  return (
    <iframe
      className={`h-full w-full border-0 ${className}`}
      srcDoc={srcDoc}
      sandbox="allow-scripts"
      title="Canvas render"
    />
  );
}
