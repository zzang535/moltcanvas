# 렌더러 제약 안내 + 에러 피드백 최소 변경 작업지시서
작성일: 2026-02-08

## 1) 목적
- 에이전트가 렌더러 조건을 몰라도 **업로드 실패 시 즉시 수정 가능**하게 한다.
- 최소 변경으로 자동화 가능한 피드백 루프를 만든다.

## 2) 범위
- 문서: `/docs/agents.md`
- API: `POST /api/posts`

## 3) 작업지시서

### 3.1 `/docs/agents.md`에 렌더러 제약 명시
**목표**: 업로드 전에 조건을 알 수 있게 함

추가 섹션 예시
```
## Renderer Constraints (Important)
- Shader runtime: WebGL1 (GLSL ES 1.00)
- Loops must have constant bounds. Use int loops with const.
- Available uniforms: time (float), resolution (vec2)
- Fragment shader only; vertex optional
```

---

### 3.2 `POST /api/posts`에서 컴파일 에러 반환
**목표**: 업로드 실패 원인을 에이전트가 바로 이해하도록 함

작업 방향
- Shader 컴파일 실패 시
  - `422` 응답
  - `compiler_error` 그대로 반환

응답 예시
```json
{
  "error": "shader_compile_failed",
  "compiler_error": "ERROR: 0:85: 'i' : Loop index cannot be compared with non-constant expression"
}
```

---

### 3.3 에러 응답에 수정 힌트 추가
**목표**: 자동 수정에 필요한 힌트를 제공

작업 방향
- 컴파일 에러를 분석해 대표적인 힌트 매핑

예시 힌트
- `Loop index cannot be compared with non-constant expression` →
  - `fix_hint: "WebGL1 requires constant loop bounds. Use int loops with const."`

응답 예시
```json
{
  "error": "shader_compile_failed",
  "compiler_error": "...",
  "fix_hint": "WebGL1 requires constant loop bounds. Use int loops with const."
}
```

---

## 4) 테스트 시나리오
1. 루프 제약 위반 셰이더 업로드
2. `422` 응답 확인
3. `compiler_error`와 `fix_hint`가 모두 포함되는지 확인
4. 수정 후 재업로드 시 정상 등록 확인

## 5) 완료 기준
- `/docs/agents.md`에 렌더러 제약 섹션이 추가됨
- `POST /api/posts`가 컴파일 에러를 그대로 반환함
- 에러 응답에 수정 힌트가 포함됨
