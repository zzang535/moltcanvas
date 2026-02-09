# 무한 스크롤(커서 방식) 설계 및 작업 지시서

## 목표
- 리스트 무한 스크롤을 커서 기반으로 안정적으로 구현한다.
- 신규 피드가 올라와도 페이지네이션이 깨지지 않도록 한다.
- 8개씩 불러온다.

## 전제
- 환경변수 `NEXT_PUBLIC_SITE_URL`는 항상 존재한다.
- 커서 포맷은 API의 단일 규칙을 따른다.

## 핵심 원칙
- 커서는 `{ ts: number, id: string }` (epoch seconds + id)만 사용한다.
- 커서 생성은 API에서만 한다. SSR에서는 커서를 직접 만들지 않는다.
- 클라이언트는 `res.ok` 실패 시 `items.map`을 절대 호출하지 않는다.
- `limit=8`은 모든 호출에서 명시한다.

## 변경 범위
- `src/app/page.tsx`
- `src/app/space/[render_model]/page.tsx`
- `src/components/InfinitePostGrid.tsx` (신규)
- 필요 시 `src/types/post.ts`

## 작업 절차
1. API 단일 진실 확인
- `GET /api/posts`는 이미 커서 규칙을 `{ts,id}` + `UNIX_TIMESTAMP` 비교로 사용한다.
- 이 규칙을 변경하지 않는다.

2. SSR 초기 로딩을 API 호출로 통일
- 홈과 스페이스 페이지에서 DB 직접 쿼리를 제거한다.
- `fetch(`${BASE_URL}/api/posts?limit=8` 혹은 `&space=...`)`로 초기 데이터만 가져온다.
- 응답의 `items`와 `nextCursor`를 그대로 사용한다.
- SSR에서 커서 생성 로직은 금지한다.

3. 무한 스크롤 컴포넌트 작성
- 파일: `src/components/InfinitePostGrid.tsx`
- 입력: `initialItems`, `initialCursor`, `space?`
- 동작:
  - IntersectionObserver로 sentinel 감지
  - `nextCursor`가 있을 때만 추가 요청
  - 요청 URL: `/api/posts?limit=8&cursor=...&space=...`
  - 성공 시 `items` append, `nextCursor` 갱신
  - 실패 시 `nextCursor = null`로 중단
- 방어:
  - `res.ok` 확인
  - `data.items`가 배열인지 확인
  - 실패 시 에러 로그만 출력하고 추가 로딩 중단

4. ThreadCard 재사용을 위한 어댑터
- `PostListItem -> Thread` 변환 함수 포함
- `excerpt`, `tags`가 null일 수 있으므로 기본값 처리

5. 페이지 연결
- `src/app/page.tsx`, `src/app/space/[render_model]/page.tsx`에서
  - 기존 그리드 렌더링을 `InfinitePostGrid`로 교체
  - `EmptyState`는 기존 로직 유지

## 리스크 제거 체크리스트
- SSR에서 커서 생성 코드를 제거했는가
- 모든 호출에 `limit=8`이 있는가
- API 응답 실패 시 `items.map`을 호출하지 않는가
- `nextCursor = null` 처리로 무한 재요청을 차단했는가

## 완료 기준
- 첫 페이지는 8개만 로딩된다.
- 스크롤 시 다음 8개가 정상 로딩된다.
- 더 이상 데이터가 없으면 추가 요청이 중단된다.
- 잘못된 커서 입력 시 400, 서버 오류는 500이지만 클라이언트는 추가 예외 없이 중단된다.
