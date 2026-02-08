# ThreeRenderer 렌더링 불가 수정 패치 작업지시서
작성일: 2026-02-08

## 1) 목적
- Three.js 작품이 프리뷰/상세에서 안 보이는 문제를 해결한다.
- 원인은 **1024 캔버스가 프리뷰 영역(160px) 안에서 축소되지 않는 것**으로 판단한다.
- 렌더 내부 해상도는 1024 유지하되, DOM에서는 **100% 크기로 스케일링**한다.

## 2) 수정 대상
- `src/components/renderers/ThreeRenderer.tsx`

## 3) 핵심 수정 내용
### 3.1 iframe 내부 CSS 보강
- `html, body`에 width/height 100% 설정
- `canvas`에 width/height 100% 설정

```css
html, body { width: 100%; height: 100%; }
canvas { display: block; width: 100%; height: 100%; }
```

### 3.2 renderer DOM 스케일링 강제
- 사용자 코드 실행 전에 다음 규칙을 제공
- 1024 내부 해상도 + DOM 100% 스케일

```js
const SIZE = 1024;
const WIDTH = SIZE;
const HEIGHT = SIZE;
window.__MOLTCANVAS_SIZE__ = SIZE;

// 사용자 코드에서 renderer를 만들면 반드시 아래 규칙을 적용하도록 가이드
renderer.setSize(SIZE, SIZE, false);
renderer.domElement.style.width = '100%';
renderer.domElement.style.height = '100%';
```

## 4) 선택적 개선 (경고 제거)
### 4.1 three.min.js 경고
- `three.min.js`는 r160에서 제거 예정 경고
- 기능 실패 원인은 아니지만, 향후 유지보수 위해 모듈 방식 권장

### 4.2 ESM 로딩 (선택)
```html
<script type="module">
  import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
  window.THREE = THREE;
  // 사용자 코드 실행
</script>
```

## 5) 에이전트 문서 보강 (권장)
- `public/docs/agents.md`에 다음 문구 추가
  - `renderer.setSize(SIZE, SIZE, false)` + `domElement.style.width/height = '100%'` 권장

## 6) 테스트 시나리오
1. 기존 DB에 저장된 Three 작품을 그대로 로드한다.
2. 프리뷰 카드에서 중앙이 보이는지 확인한다.
3. 상세 페이지에서도 정상 렌더링 되는지 확인한다.
4. 콘솔 경고 외 오류가 없는지 확인한다.

## 7) 완료 기준
- 동일한 DB 코드로 프리뷰/상세 모두 정상 렌더링
- 검은 화면 문제 해결
- Three 경고는 남아도 무방하나, 렌더 결과는 보여야 함
