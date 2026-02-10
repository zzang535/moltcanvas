# 무한 스크롤 500 오류 원인 분석 및 수정 작업 지시서

## 현상
- 무한 스크롤 시 `GET /api/posts?limit=12&cursor=...`가 500 에러
- 클라이언트 로그: `Cannot read properties of undefined (reading 'map')`

## 원인 분석 (핵심)
1. **커서 포맷 불일치**
   - 홈/스페이스 페이지에서 `created_at`을 `DATE_FORMAT(..., '%Y-%m-%dT%H:%i:%sZ')`로 ISO 변환한 값을 커서에 인코딩함.
   - API는 커서 값을 그대로 SQL 비교에 사용 (`p.created_at < ?`).
   - ISO 문자열(`2026-02-08T06:57:05Z`)은 MySQL DATETIME/TIMESTAMP 비교에 적합하지 않아 오류 발생 → 500.

2. **오류 응답 방어 부족**
   - 500 응답에서도 `data.items.map`을 실행하여 클라이언트에서 추가 에러 발생.

## 수정 방향
- **커서에는 DB 원본 `created_at` 형식**(예: `YYYY-MM-DD HH:mm:ss`)을 사용한다.
- UI 표시용 `createdAt`은 **ISO 8601(Z 포함)**으로 유지한다.
- API와 페이지 모두 **커서 생성에 사용하는 값**을 통일한다.
- 클라이언트는 **응답 실패 시 map 실행을 중단**한다.

## 수정 범위
- `src/app/page.tsx`
- `src/app/space/[render_model]/page.tsx`
- `src/app/api/posts/route.ts`
- `src/components/PostList.tsx`

## 구현 지시

### 1) 페이지 쿼리에서 raw created_at 분리
- `p.created_at AS created_at_raw` 추가
- `DATE_FORMAT(...) AS created_at`는 UI 표시용으로 유지
- 커서 생성 시 `created_at_raw` 사용

예시 (페이지 SQL)
```sql
SELECT
  p.id,
  ...,
  p.created_at AS created_at_raw,
  DATE_FORMAT(p.created_at, '%Y-%m-%dT%H:%i:%sZ') AS created_at,
  ...
```

커서 생성
```ts
const nextCursor = hasMore && lastRow
  ? encodeCursor(lastRow.created_at_raw, lastRow.id)
  : null;
```

### 2) API GET /api/posts 커서 기준 통일
- API에서도 `created_at_raw`를 별도로 가져와 커서 인코딩에 사용
- 응답에는 ISO `created_at`만 노출

예시 (API SQL)
```sql
SELECT
  p.created_at AS created_at_raw,
  DATE_FORMAT(p.created_at, '%Y-%m-%dT%H:%i:%sZ') AS created_at,
  ...
```

커서 인코딩
```ts
const nextCursor = hasMore && lastItem
  ? encodeCursor(lastItem.created_at_raw, lastItem.id)
  : null;
```

### 3) PostList 로딩 방어
- `res.ok` 확인 후 처리
- 실패 시 `data.items.map` 실행하지 않도록 방어

예시
```ts
if (!res.ok) {
  console.error('Failed to load more posts', await res.text());
  setLoading(false);
  return;
}
```

## 완료 기준
- 무한 스크롤 요청이 500 없이 정상적으로 이어진다.
- 커서 기반 페이지네이션이 안정적으로 동작한다.
- 오류 발생 시 클라이언트가 추가 예외를 내지 않는다.
