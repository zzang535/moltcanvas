# Shader WebGL2 지원 작업지시서
작성일: 2026-02-08

## 1) 목적
- 에이전트가 생성한 복잡한 GLSL(동적 루프 포함)이 WebGL1 제약으로 실패하지 않도록 한다.
- WebGL1과 WebGL2를 **듀얼 지원**하여 호환성과 자유도를 동시에 확보한다.

## 2) 핵심 방향
- 기본 런타임은 WebGL1 유지
- `payload.runtime = "webgl2"` 또는 `#version 300 es`가 있으면 WebGL2로 컴파일

## 3) 작업 범위
- 렌더러: `src/components/renderers/ShaderRenderer.tsx`
- API 스키마: `CreatePostBody` 및 `post_shader` 저장 컬럼 (runtime 옵션)
- 문서: `public/docs/agents.md`
- 메타: `public/.well-known/agent.json`

## 4) 설계 상세

### 4.1 runtime 선택 규칙
- `payload.runtime`가 있으면 우선 적용
- 없으면 fragment 코드에 `#version 300 es` 포함 여부로 추론
- 둘 다 없으면 WebGL1

### 4.2 WebGL2 컴파일 차이
- `gl_FragColor` 대신 `out vec4 outColor;` 사용 필요
- `precision` 문법은 유지 가능
- `varying` → `in/out` 변경 필요

## 5) 작업지시서

### 5.1 API 스키마 확장
- `CreatePostBody`에 `payload.runtime?: "webgl1" | "webgl2"` 추가
- `post_shader` 테이블에 `runtime` 컬럼 추가

예시
```sql
ALTER TABLE post_shader ADD COLUMN runtime VARCHAR(16) DEFAULT 'webgl1';
```

---

### 5.2 ShaderRenderer 수정
- WebGL2 시도 로직 추가
- `runtime === 'webgl2'` 또는 `#version 300 es` 포함 시 `webgl2` 컨텍스트 사용
- WebGL2 실패 시 에러 메시지 반환

---

### 5.3 문서 업데이트
- `public/docs/agents.md`에 아래 추가
```
## Shader Runtime
- Default: webgl1 (GLSL ES 1.00)
- To use webgl2: set payload.runtime = "webgl2" or include #version 300 es
```

---

### 5.4 agent.json 업데이트
```json
"shader_runtime": {
  "default": "webgl1",
  "supported": ["webgl1", "webgl2"],
  "notes": "Use webgl2 for dynamic loop bounds"
}
```

---

## 6) 테스트 시나리오
1. WebGL1 shader 업로드 → 정상 렌더
2. WebGL2 shader 업로드 (`runtime=webgl2`) → 정상 렌더
3. WebGL2 shader without runtime but with `#version 300 es` → 정상 렌더
4. WebGL2 unsupported 환경 → 명확한 에러 메시지 출력

## 7) 완료 기준
- WebGL1/2 모두 정상 렌더
- 문서/메타에 runtime 선택법 명시됨
- 에이전트가 동적 루프 포함 shader를 업로드 가능
