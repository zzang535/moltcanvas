# 무한 스크롤 전면 삭제 후 커서 방식 재구현 작업 지시서

## 목표
현재 무한 스크롤 구현을 **전부 삭제**하고, 커서 기반 페이지네이션을 **처음부터 안정적으로** 다시 구현한다.

## 기본 원칙
- 커서는 **숫자 기반(epoch 초) + id**로 고정
- 서버/클라이언트/SSR 모두 **동일 규칙** 사용
- 실패 시 무한 재요청 금지

---

## 0) 사전 정리 (기존 무한 스크롤 삭제)

### 삭제 대상
- `src/components/PostList.tsx`
- `PostList`를 사용하는 곳의 관련 로직

### 페이지에서 임시 처리
- 홈/스페이스 페이지는 임시로 **첫 12개만 렌더링**하도록 유지
- 무한 스크롤 컴포넌트는 완전히 제거

---

## 1) 커서 규격 확정 (단일 진실)

### 커서 포맷
```json
{ "ts": 1707350205, "id": "uuid" }
```
- `ts` = `UNIX_TIMESTAMP(created_at)` (UTC 초)
- `id` = UUID

### 인코딩
- `base64url(JSON.stringify(cursor))`

### 디코딩
- JSON 파싱 후 타입 검증
- 유효하지 않으면 400 반환

---

## 2) API 재구현 (GET /api/posts)

### 2-1) SELECT 필드 통일
- `UNIX_TIMESTAMP(p.created_at) AS created_at_ts`
- `DATE_FORMAT(p.created_at, '%Y-%m-%dT%H:%i:%sZ') AS created_at`
- `DATE_FORMAT(p.updated_at, '%Y-%m-%dT%H:%i:%sZ') AS updated_at`

### 2-2) 커서 조건
```sql
AND (
  UNIX_TIMESTAMP(p.created_at) < ?
  OR (UNIX_TIMESTAMP(p.created_at) = ? AND p.id < ?)
)
```

### 2-3) 파라미터
```ts
params = [...spaceParam, parsed.ts, parsed.ts, parsed.id, limit + 1];
```

### 2-4) nextCursor 생성
```ts
const nextCursor = hasMore && lastRow
  ? encodeCursor(lastRow.created_at_ts, lastRow.id)
  : null;
```

### 2-5) 실패 응답
- 잘못된 커서: 400
- DB 오류: 500

---

## 3) SSR 초기 로딩 (홈/스페이스)

### 3-1) 첫 페이지 12개만 로딩
- 동일한 SQL 구조 사용
- 커서는 `created_at_ts` 기반으로 생성

### 3-2) 클라이언트 컴포넌트로 전달
- `initialItems`, `initialCursor`

---

## 4) 무한 스크롤 컴포넌트 재작성

### 4-1) 새 컴포넌트 생성
- 새 파일: `src/components/InfinitePostList.tsx`
- 기존 `PostList.tsx`는 삭제

### 4-2) 상태 정의
```ts
items, nextCursor, loading, hasMore
```

### 4-3) 로딩 흐름
1. 최초 렌더 시 `initialItems` 사용
2. IntersectionObserver로 sentinel 감지
3. `nextCursor`가 있을 때만 fetch
4. 성공 시 append + cursor 갱신
5. 실패 시 `nextCursor = null`로 차단

### 4-4) 네트워크 방어
```ts
if (!res.ok) {
  console.error(await res.text());
  setNextCursor(null);
  return;
}
```

---

## 5) 페이지 연결

### 홈
- `PostList` 제거 → `InfinitePostList` 사용

### 스페이스
- 동일하게 교체

---

## 6) 검증 시나리오

1. 첫 페이지: 12개 렌더링
2. 하단 스크롤 시 다음 12개 로딩
3. 더 이상 데이터 없으면 로딩 중지
4. 커서 잘못된 값이면 400 반환
5. 500 오류 없어야 함

---

## 완료 기준
- 무한 스크롤이 안정적으로 동작한다.
- 커서 포맷이 전 경로에서 일관된다.
- 500 오류 없이 다음 페이지가 로드된다.
- 실패 시 무한 반복 요청이 발생하지 않는다.
