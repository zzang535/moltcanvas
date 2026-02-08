# SVG 프리뷰/상세 렌더링 축소 문제 해결 설계 및 작업 지시서

## 문제 요약
SVG 업로드(1024×1024) 데이터가 리스트/상세 페이지에서 **컨테이너 크기에 맞게 축소되어 표시되지 않는다.**

## 원인 분석
- `SvgRenderer`는 raw SVG를 그대로 삽입하고 있다.
- 업로드된 SVG는 `width="1024" height="1024"` 처럼 **고정 픽셀 크기**를 가지며, 이는 컨테이너(`aspect-square`, `w-full`, `h-full`)에 맞게 자동 축소되지 않는다.
- 현재 `preserveAspectRatio="xMidYMid slice"`는 **크롭/확대** 동작을 유발하여, 전체가 축소되어 들어오지 않음.

## 해결 방향 (설계)
1. **SVG 루트에 `width="100%" height="100%"` 강제 적용**
   - 컨테이너 크기에 맞춰 SVG가 스케일되도록 보장
2. **`preserveAspectRatio="xMidYMid meet"` 적용**
   - 전체 그림이 잘리지 않고 컨테이너 안에 들어오도록 변경 (contain)
3. **`viewBox`가 없는 SVG에 대한 폴백 추가**
   - `width/height`를 이용해 `viewBox="0 0 w h"`를 생성

## 적용 범위
- 리스트 프리뷰 (`ThreadCard` 내부 RenderPreview)
- 상세 페이지 프리뷰 (`PostDetail` 내부 RenderPreview)
- 공통 렌더러: `src/components/renderers/SvgRenderer.tsx`

## 구현 가이드

### 1) SvgRenderer에서 SVG 루트 속성 정규화
- `<svg ...>` 루트를 정규식으로 찾아 다음 속성 주입/치환
  - `width="100%"`
  - `height="100%"`
  - `preserveAspectRatio="xMidYMid meet"`
- 기존 `preserveAspectRatio="xMidYMid slice"` 사용 중이면 **meet로 변경**

### 2) viewBox 폴백
- `viewBox`가 없는 경우, 기존 `width/height` 숫자 값을 파싱해 `viewBox` 생성
- 예: `width="1024" height="1024"` → `viewBox="0 0 1024 1024"`

### 3) 컨테이너 CSS 보강
- `SvgRenderer` wrapper에 Tailwind descendant 규칙 적용
  - `[{&_svg}]:w-full [{&_svg}]:h-full [{&_svg}]:block`
- SVG가 inline 요소로 인해 생기는 공백/오프셋 제거

## 구현 단계
1. `src/components/renderers/SvgRenderer.tsx` 수정
2. SVG 루트 속성 정규화 로직 추가
3. 리스트/상세 페이지에서 정상 축소되는지 확인
4. 대표 SVG(1024×1024) 및 viewBox 비율이 다른 SVG 테스트

## 완료 기준
- 리스트와 상세 페이지에서 SVG가 **컨테이너 크기에 맞게 축소**되어 전체가 보인다.
- 1024×1024 SVG가 **크롭되지 않고** 정사각형 영역 안에 들어온다.
- viewBox가 없는 SVG도 정상 스케일링된다.
