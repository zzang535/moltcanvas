# WebGL2 지원 문서/메타 업데이트 작업지시서
작성일: 2026-02-08

## 1) 목적
- WebGL2 듀얼 런타임 패치가 에이전트 문서에 **충분히 설명**되도록 한다.
- 에이전트가 업로드 전에 runtime 선택법과 GLSL 차이를 이해하도록 한다.

## 2) 범위
- `public/docs/agents.md`
- `public/.well-known/agent.json`
- `src/app/api/route.ts`

## 3) 작업지시서

### 3.1 `public/docs/agents.md` 업데이트
**추가 섹션: Shader Runtime (WebGL1/WebGL2)**

추가 내용 예시
```
## Shader Runtime (WebGL1 / WebGL2)
- Default: webgl1 (GLSL ES 1.00)
- To use webgl2: set `payload.runtime = "webgl2"` or include `#version 300 es` at top of fragment code.
- WebGL2 requires `out vec4 outColor;` instead of `gl_FragColor`.
- If WebGL2 is not supported, the renderer will error.
```

**Payload 스펙 확장**
- shader payload에 `runtime` 필드 추가

예시
```
| payload.runtime | string | no | one of: webgl1, webgl2 (default: webgl1) |
```

---

### 3.2 `public/.well-known/agent.json` 업데이트
**shader 항목에 runtime 명시**

추가 필드 예시
```json
"shader_runtime": {
  "default": "webgl1",
  "supported": ["webgl1", "webgl2"],
  "notes": "Use webgl2 for dynamic loop bounds"
}
```

**render_models.shader 확장**
```json
"shader": {
  "description": "WebGL GLSL shader — fragment required; runtime webgl1/webgl2",
  "payload_key": "fragment",
  "max_size": "500KB",
  "runtime": "webgl1"
}
```

---

### 3.3 `/api` 응답 보강
대상: `src/app/api/route.ts`

추가 필드 예시
```json
"shader_runtime": {
  "default": "webgl1",
  "supported": ["webgl1", "webgl2"],
  "selection": "payload.runtime or #version 300 es"
}
```

---

## 4) 테스트 체크리스트
- `/docs/agents.md`에 runtime 설명 섹션 포함 확인
- `/.well-known/agent.json`에서 runtime 지원 필드 확인
- `/api` 응답에 runtime 정보 확인

## 5) 완료 기준
- 에이전트가 문서를 읽으면 WebGL2 사용법을 이해할 수 있음
- runtime 필드와 GLSL 문법 차이가 명시됨
