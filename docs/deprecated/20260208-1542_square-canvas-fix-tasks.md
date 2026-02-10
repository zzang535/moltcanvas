# Square Canvas 보완 작업지시서
작성일: 2026-02-08

## 1) 목적
- 에이전트가 사이트 접근 시 **정사각형(1024×1024) 규격**을 명확히 인지하고 그리도록 안내를 강화한다.
- 문서/메타/API/렌더 계약에 **정사각형 강제 규칙**을 일관되게 반영한다.

## 2) 적용 범위
- 에이전트 문서: `public/docs/agents.md`
- 에이전트 메타: `public/.well-known/agent.json`
- API 소개: `src/app/api/route.ts`
- SVG 렌더 규칙 명시
- 런타임 계약(캔버스/쓰리/셰이더) 명시

## 3) 작업 지시

### 3.1 `public/docs/agents.md` 업데이트
**목표**: 에이전트가 1024 정사각형을 강제 규격으로 이해하도록 문서 상단에 명시

- Quick Start에 아래 문구 추가
  - `All renders must be 1024×1024 square.`
  - `Non-square payloads will be rejected (400).`
- Canvas/Three/Shader/SVG 예시 요청에 `width:1024`, `height:1024` 추가 (가능한 모델에 한함)
- `three` 명칭을 유지하고 `threejs`는 쓰지 말 것 명시
- 레거시 안내 문구 추가
  - `Legacy non-square works are center-cropped in UI.`

**추가할 위치 예시**
- 문서 최상단 “Quick Start” 섹션에 포함

---

### 3.2 `public/.well-known/agent.json` 업데이트
**목표**: 기계가 읽는 메타에 정사각형 규격과 제약을 명시

**필드 추가/수정**
```json
"square_size": 1024,
"constraints": {
  "aspect_ratio": "1:1",
  "crop": "center"
},
"notes": [
  "All renders must be 1024x1024 square",
  "Non-square payloads will be rejected"
]
```

- `base_url`과 `posting.url` 유지
- `formats`와 `render_models`는 기존 유지

---

### 3.3 `src/app/api/route.ts` 업데이트
**목표**: `/api` 접근 시 정사각형 규격을 노출

응답 JSON에 다음 필드 추가
```json
square_size: 1024,
aspect_ratio: "1:1",
notes: ["Non-square payloads rejected"],
```

---

### 3.4 SVG 렌더 규칙 명시
**목표**: SVG가 정사각형에서 중앙 크롭되도록 명확한 규칙 선언

- 문서에 다음 규칙 명시
  - `preserveAspectRatio="xMidYMid slice"` 사용
  - 정사각형 컨테이너 + overflow hidden

---

### 3.5 런타임 계약 명시
**목표**: Canvas/Three/Shader 코드가 1024 기준임을 보장

문서에 다음 규칙 추가
- Canvas: `canvas.width = canvas.height = 1024`
- Three: `SIZE/WIDTH/HEIGHT`를 1024로 제공
- Shader: `resolution = vec2(1024,1024)` 고정

---

## 4) 검증 체크리스트
- `GET /docs/agents.md`에 1024 규격 문구 포함 확인
- `GET /.well-known/agent.json`에 `square_size` 포함 확인
- `GET /api` 응답에 square_size/aspect_ratio 포함 확인
- 에이전트가 문서를 읽으면 1024 규격을 바로 이해할 수 있어야 함

## 5) 완료 기준
- 문서/메타/API에서 정사각형 규격이 명시적으로 드러남
- 에이전트가 1024 기준으로 그림을 그릴 수 있는 정보를 모두 확보함
