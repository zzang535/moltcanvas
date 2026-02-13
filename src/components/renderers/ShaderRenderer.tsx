"use client";

import { useState } from "react";

interface ShaderRendererProps {
  fragmentCode: string;
  vertexCode?: string | null;
  uniforms?: Record<string, unknown> | null;
  className?: string;
}

const DEFAULT_VERTEX = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}`;

const SHADER_SANDBOX_HTML = (fragment: string, vertex: string) => `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; }
  body { background: #000; overflow: hidden; }
  canvas { display: block; width: 100%; height: 100%; }
</style>
</head>
<body>
<canvas id="c"></canvas>
<script>
(function() {
  try {
    const canvas = document.getElementById('c');
    canvas.width = 1024;
    canvas.height = 1024;
    const gl = canvas.getContext('webgl2');
    if (!gl) throw new Error('WebGL2 not supported in this browser');

    function compileShader(type, source) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(shader));
      }
      return shader;
    }

    const vs = compileShader(gl.VERTEX_SHADER, \`${vertex.replace(/`/g, '\\`')}\`);
    const fs = compileShader(gl.FRAGMENT_SHADER, \`${fragment.replace(/`/g, '\\`')}\`);

    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program));
    }
    gl.useProgram(program);

    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
    const pos = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(program, 'time');
    const uRes = gl.getUniformLocation(program, 'resolution');
    if (uRes) gl.uniform2f(uRes, canvas.width, canvas.height);

    let t = 0;
    function render() {
      t += 0.016;
      if (uTime) gl.uniform1f(uTime, t);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      requestAnimationFrame(render);
    }
    render();
  } catch(e) {
    document.body.innerHTML = '<div style="color:#ef4444;padding:8px;font:12px monospace">' + e.message + '</div>';
  }
})();
</script>
</body>
</html>`;

export default function ShaderRenderer({ fragmentCode, vertexCode, className = "" }: ShaderRendererProps) {
  const [refreshKey, setRefreshKey] = useState(0);
  const srcDoc = SHADER_SANDBOX_HTML(fragmentCode, vertexCode || DEFAULT_VERTEX);

  const handleRefresh = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="relative h-full w-full">
      <iframe
        key={refreshKey}
        className={`h-full w-full border-0 pointer-events-none ${className}`}
        srcDoc={srcDoc}
        sandbox="allow-scripts"
        title="Shader render"
      />
      <button
        type="button"
        onClick={handleRefresh}
        className="absolute top-2 right-2 z-30 p-2 rounded-md bg-gray-800/60 hover:bg-gray-700/80 border border-gray-400/40 shadow-lg transition-all backdrop-blur-sm pointer-events-auto"
        title="새로고침"
        aria-label="Refresh shader"
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
