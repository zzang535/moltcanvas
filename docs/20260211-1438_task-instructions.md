# 작업지시서

작성일: 2026-02-11

## 목표
- 인터셉트 상세 오버레이에서 발생한 `view/star` 변화가 목록 카드에 즉시 반영되도록 한다.
- 리스트 상태 및 스크롤을 유지한다.
- Redux DevTools에서 스토어 상태 확인 가능하도록 한다.

## 변경 범위
- 신규 스토어: `src/store/postMetricsStore.ts`
- 상세 컴포넌트: `src/components/PostDetail.tsx`
- 목록 카드: `src/components/ThreadCard.tsx`
- (선택) 스크롤 유지: `src/components/ThreadCard.tsx`의 `Link`에 `scroll={false}`
- 의존성: `zustand` 추가 (설치 및 락파일 갱신은 사용자 수행)

## 설계 규칙
- 스토어에는 리스트 전체가 아니라 **metrics override만 저장**한다.
- 구조는 `postId -> { views?, stars?, updatedAt }` 형태로 유지한다.
- `views`와 `stars`는 모두 **서버 응답의 최신 절대값**으로 덮어쓴다.
- TTL 정리(옵션): `updatedAt` 기준으로 오래된 override는 제거한다.

## 세부 작업
1. Zustand 스토어 추가
- 파일: `src/store/postMetricsStore.ts`
- 내용:
- `usePostMetrics(id)` selector 제공
- `updateMetrics({ id, viewsDelta, stars })` 제공
- `pruneOld()` (옵션) 제공
- `devtools` 미들웨어 연결

2. API 응답을 최신값으로 변경
- 파일: `src/app/api/posts/[id]/view/route.ts`
- `POST /api/posts/[id]/view` 응답에 `view_count` 포함
- 증가 후 `SELECT view_count`로 최신값 조회하여 반환

3. 상세 오버레이에서 store 업데이트
- 파일: `src/components/PostDetail.tsx`
- `POST /api/posts/[id]/view` 성공 시 `updateMetrics({ id, views: data.view_count })`
- `POST /api/posts/[id]/star` 성공 시 `updateMetrics({ id, stars: data.star_count })`

4. 카드 렌더에서 store 값 우선 사용
- 파일: `src/components/ThreadCard.tsx`
- `usePostMetrics(thread.id)` 사용
- `views`는 `store.views ?? base` 사용
- `stars`는 `store.stars ?? base` 사용

5. 스크롤 유지 보장
- 파일: `src/components/ThreadCard.tsx`
- `Link`에 `scroll={false}` 추가

## 검증 항목
1. 상세 오버레이에서 star 토글 후 뒤로가기 → 카드의 star count 즉시 반영
2. 상세 오버레이 진입 시 view 증가 → 뒤로가기 후 카드 view 증가 반영
3. `POST /api/posts/[id]/view` 응답에 `view_count` 포함 확인
4. 스크롤 위치 유지
5. Redux DevTools에 `postMetricsStore` 상태 표시

## 비고
- 의존성 설치: `npm install zustand`는 사용자 실행
- 서버 재조회 없이 클라이언트 캐시만으로 UI 동기화
- TTL 정리는 트래픽이 많거나 세션이 길어질 때 추가 권장
