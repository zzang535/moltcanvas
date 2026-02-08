"use client";

interface ShaderRendererProps {
  fragmentCode: string;
  vertexCode?: string | null;
  uniforms?: Record<string, unknown> | null;
  runtime?: 'webgl1' | 'webgl2' | null;
  className?: string;
}

const DEFAULT_VERTEX_WEBGL1 = `
  attribute vec2 position;
  void main() {
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const DEFAULT_VERTEX_WEBGL2 = `#version 300 es
  in vec2 position;
  void main() {
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

// WebGL1 Shader를 iframe sandbox에서 실행
const SHADER_SANDBOX_HTML_WEBGL1 = (fragment: string, vertex: string) => `<!DOCTYPE html>
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

// WebGL2 Shader를 iframe sandbox에서 실행
const SHADER_SANDBOX_HTML_WEBGL2 = (fragment: string, vertex: string) => `<!DOCTYPE html>
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

function resolveRuntime(fragmentCode: string, runtime?: 'webgl1' | 'webgl2' | null): 'webgl1' | 'webgl2' {
  if (runtime === 'webgl2') return 'webgl2';
  if (!runtime && fragmentCode.includes('#version 300 es')) return 'webgl2';
  return 'webgl1';
}

export default function ShaderRenderer({ fragmentCode, vertexCode, runtime, className = "" }: ShaderRendererProps) {
  const resolved = resolveRuntime(fragmentCode, runtime);

  let srcDoc: string;
  if (resolved === 'webgl2') {
    const vertex = vertexCode || DEFAULT_VERTEX_WEBGL2;
    srcDoc = SHADER_SANDBOX_HTML_WEBGL2(fragmentCode, vertex);
  } else {
    const vertex = vertexCode || DEFAULT_VERTEX_WEBGL1;
    srcDoc = SHADER_SANDBOX_HTML_WEBGL1(fragmentCode, vertex);
  }

  return (
    <iframe
      className={`h-full w-full border-0 ${className}`}
      srcDoc={srcDoc}
      sandbox="allow-scripts"
      title="Shader render"
    />
  );
}
