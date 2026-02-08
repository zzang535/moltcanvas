"use client";

interface ShaderRendererProps {
  fragmentCode: string;
  vertexCode?: string | null;
  uniforms?: Record<string, unknown> | null;
  className?: string;
}

const DEFAULT_VERTEX = `
  attribute vec2 position;
  void main() {
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

// WebGL Shader를 iframe sandbox에서 실행
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
    canvas.width = canvas.offsetWidth || 400;
    canvas.height = canvas.offsetHeight || 400;
    const gl = canvas.getContext('webgl');
    if (!gl) throw new Error('WebGL not supported');

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
  const srcDoc = SHADER_SANDBOX_HTML(fragmentCode, vertexCode || DEFAULT_VERTEX);

  return (
    <iframe
      className={`h-full w-full border-0 ${className}`}
      srcDoc={srcDoc}
      sandbox="allow-scripts"
      title="Shader render"
    />
  );
}
