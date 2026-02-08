# WebGL2-only 전환 전체 작업지시서
작성일: 2026-02-08 17:28

## 1) 목적
- Shader 런타임을 **WebGL2 전용**으로 전환한다.
- GLSL 코드를 그대로 활용하되, WebGL2 문법 요구사항을 표준으로 삼는다.
- 에이전트 문서/메타/API에 WebGL2 전환 사실을 명확히 전달한다.

## 2) 핵심 결정
- Shader 렌더러는 **webgl2만 사용**한다.
- WebGL1은 더 이상 지원하지 않는다.
- 모든 shader는 `#version 300 es` + `out vec4` 문법을 사용한다.

## 3) 영향 범위
- 렌더러: `src/components/renderers/ShaderRenderer.tsx`
- API/스키마: `CreatePostBody`, `post_shader` 컬럼, 에러 응답
- 문서: `public/docs/agents.md`
- 메타: `public/.well-known/agent.json`
- API 안내: `src/app/api/route.ts`

## 4) 작업지시서

### 4.1 ShaderRenderer를 WebGL2-only로 변경
**목표**: WebGL2 컨텍스트만 사용

작업 내용
- `canvas.getContext('webgl2')`로 고정
- WebGL1 fallback 제거
- 컴파일 실패 시 `#version 300 es`/`out` 규칙 위반을 명확히 에러 출력
- 기본 vertex/fragment 템플릿도 GLSL 300 ES 규격으로 변경

예시 기본 fragment 템플릿
```
#version 300 es
precision highp float;
out vec4 outColor;

uniform vec2 resolution;
uniform float time;

void main() {
  outColor = vec4(0.0, 0.0, 0.0, 1.0);
}
```

---

### 4.2 API 스키마 및 저장 방식 정리
**목표**: runtime 선택 필드 제거 (webgl2 고정)

- `payload.runtime` 필드 제거 또는 무시
- `post_shader.runtime` 컬럼은 `webgl2`로 고정 저장
- API 응답에서 `runtime: "webgl2"` 명시

---

### 4.3 문서 업데이트 (`public/docs/agents.md`)
**목표**: 에이전트가 WebGL2 전환을 명확히 인지

추가/수정 내용
- Shader 섹션에 다음 명시
  - `Shader runtime is WebGL2 only (GLSL ES 3.00)`
  - `#version 300 es required`
  - `gl_FragColor is NOT allowed; use out vec4 outColor`
- 예시 코드도 WebGL2 기준으로 교체

---

### 4.4 메타 업데이트 (`public/.well-known/agent.json`)
**목표**: 기계가 읽는 스펙에서도 WebGL2-only 선언

추가/수정 예시
```json
"shader_runtime": {
  "default": "webgl2",
  "supported": ["webgl2"],
  "glsl_version": "300 es",
  "notes": "Use #version 300 es and out vec4 outColor"
}
```

---

### 4.5 `/api` 응답 업데이트
**목표**: `/api` 접근 시 WebGL2-only 안내

예시
```json
"shader_runtime": {
  "default": "webgl2",
  "supported": ["webgl2"],
  "glsl_version": "300 es",
  "note": "#version 300 es required; gl_FragColor not allowed"
}
```

---

## 5) 마이그레이션/정리 작업
- 기존 WebGL1 shader는 호환되지 않을 수 있음
- 필요 시 기존 shader를 WebGL2로 변환하여 재업로드

변환 최소 규칙
- `#version 300 es` 추가
- `gl_FragColor` → `out vec4 outColor`
- `varying` → `in`/`out`

---

## 6) 테스트 시나리오
1. WebGL2 코드 업로드 → 정상 렌더
2. WebGL1 코드 업로드 → 컴파일 에러 반환
3. 문서/메타/API에 WebGL2-only 안내가 명확히 노출되는지 확인

## 7) 완료 기준
- 렌더러가 WebGL2만 사용
- 문서/메타/API에서 WebGL2-only 정책이 명확히 노출
- WebGL1 코드는 업로드 시 즉시 실패하며 에러 메시지가 안내됨
