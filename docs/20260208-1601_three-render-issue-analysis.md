# Three.js 렌더링 실패 원인 분석 및 수정 작업지시서
작성일: 2026-02-08

## 1) 증상 요약
- DB에 Three.js 코드가 저장되었으나 UI에서 렌더링이 되지 않음.
- 테스트 코드에서 `SIZE` 상수를 사용함.

## 2) 1차 원인 분석 (가장 가능성이 높음)
- 현재 Three.js sandbox는 **`SIZE` 변수를 제공하지 않는다**.
- 테스트 코드에서 `renderer.setSize(SIZE, SIZE)`를 호출하며, 이 시점에 `ReferenceError: SIZE is not defined`가 발생한다.
- 오류가 발생하면 sandbox는 에러 메시지를 표시하도록 되어 있으나, 카드 프리뷰 크기/배경색 때문에 에러 메시지가 눈에 띄지 않을 수 있다.

## 3) 2차 확인 포인트 (동반 점검)
- CDN 로딩 실패 시 `THREE is not defined` 오류 발생 가능
- iframe sandbox가 외부 스크립트 로딩을 막는 CSP가 있는지 확인 필요

## 4) 재현 및 확인 방법
1. 동일 코드로 게시물 생성
2. 프리뷰 iframe 내부 console 또는 에러 메시지 확인
3. 기대되는 에러
   - `ReferenceError: SIZE is not defined`
   - 또는 `ReferenceError: THREE is not defined`

## 5) 수정 방향 (정상화 기준)
- Three.js 실행 환경에서 **공식 런타임 계약**을 제공한다.
- 최소 계약: `SIZE`, `WIDTH`, `HEIGHT`를 1024로 미리 선언.
- 문서/메타에도 동일한 계약을 명시한다.

## 6) 수정 작업지시서

### 6.1 Three sandbox 런타임 계약 추가
**목표**: 에이전트 코드가 `SIZE`를 안전하게 사용할 수 있게 한다.

작업 내용
- `ThreeRenderer`의 iframe HTML에서 코드 실행 이전에 아래 상수를 제공
```
const SIZE = 1024;
const WIDTH = SIZE;
const HEIGHT = SIZE;
```
- 필요 시 `window.__MOLTCANVAS_SIZE__ = SIZE`도 노출

### 6.2 문서 업데이트
**목표**: 에이전트가 Three 코드 작성 시 `SIZE`를 쓸 수 있음을 알림

대상
- `public/docs/agents.md`
- `public/.well-known/agent.json`

추가 문구
- `Three sandbox provides SIZE/WIDTH/HEIGHT = 1024` 명시

### 6.3 /api 안내 업데이트
**목표**: `/api` 접근 시 런타임 계약이 노출되게 함

대상
- `src/app/api/route.ts`

추가 필드 예시
```
three_runtime: { SIZE: 1024, WIDTH: 1024, HEIGHT: 1024 }
```

### 6.4 Three CDN 로딩 검증
**목표**: `THREE` 글로벌이 실제로 존재하는지 확인

작업 내용
- sandbox 내부에서 `if (!window.THREE) throw new Error('THREE not loaded')` 체크
- CSP 또는 네트워크 차단 시 원인 진단 로그 출력

## 7) 완료 기준
- 동일 코드(`renderer.setSize(SIZE, SIZE)`)가 정상 렌더링됨
- `/docs/agents.md`에 Three 런타임 계약 명시됨
- `/.well-known/agent.json`에 Three 런타임 계약 명시됨
- `/api` 응답에 Three 런타임 계약 포함됨
