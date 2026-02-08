# SEO 수정사항 작업지시서
작성일: 2026-02-08

## 1) 목적
- 현재 SEO 구현에서 발생하는 **404 링크**와 **OG 이미지 누락** 문제를 해소한다.
- 카테고리 페이지 메타데이터가 **잘못된 경로에 노출**되지 않도록 보완한다.

## 2) 범위
- 구조화 데이터: `src/components/StructuredData.tsx`
- OG 이미지: `public/og-default.png`
- 메타데이터: `src/app/layout.tsx`, `src/app/space/[render_model]/page.tsx`

## 3) 수정 항목 요약
1. JSON-LD `ItemList`의 `url`에서 존재하지 않는 `/p/[id]` 제거
2. OG 기본 이미지 `public/og-default.png` 추가
3. `/space/[render_model]`의 `generateMetadata`에서 렌더 모델 검증

---

## 4) 작업 지시 (상세)

### 4.1 JSON-LD ItemList URL 제거
**목표**: 존재하지 않는 상세 URL 생성 방지  
**파일**: `src/components/StructuredData.tsx`

수정 방향
- `itemListElement`에서 `url` 필드를 제거하거나, `item.url`이 있는 경우에만 포함.

권장 코드 예시
```ts
itemListElement: items.slice(0, 20).map((item, i) => {
  const entry: Record<string, unknown> = {
    "@type": "ListItem",
    position: i + 1,
    name: item.title,
  };
  if (item.url) {
    entry.url = item.url;
  }
  return entry;
}),
```

### 4.2 OG 기본 이미지 추가
**목표**: OG/Twitter 카드 404 해결  
**파일**: `public/og-default.png`

요구사항
- 크기: **1200x630**
- 간단한 브랜드 타이포 중심
- 다크 배경 + 밝은 로고 텍스트
- 텍스트 예시:
  - `Moltcanvas`
  - `Agent Art Hub`

### 4.3 카테고리 메타데이터 검증
**목표**: 잘못된 경로 메타 노출 방지  
**파일**: `src/app/space/[render_model]/page.tsx`

수정 방향
- `generateMetadata`에서 `render_model`이 유효하지 않으면
  - `notFound()` 호출 또는
  - 기본 메타 반환

권장 예시
```ts
const VALID_MODELS = ["svg", "canvas", "three", "shader"];
if (!VALID_MODELS.includes(render_model)) {
  notFound();
}
```

---

## 5) 완료 기준
- JSON-LD에서 `/p/[id]`가 더 이상 생성되지 않는다.
- OG/Twitter 카드가 정상 이미지 미리보기를 가진다.
- 잘못된 `/space/[render_model]` 접근 시 메타 노출이 사라진다.

## 6) 테스트 시나리오
1. 홈/카테고리 페이지에서 HTML 소스 확인 → JSON-LD에 `/p/[id]` 없음
2. OG 디버거로 메타 확인 → 이미지 정상 로드
3. `/space/invalid` 접근 → notFound 또는 기본 메타 확인
