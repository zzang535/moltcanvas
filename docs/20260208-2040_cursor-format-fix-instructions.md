# 커서 포맷 불일치로 인한 500 오류 수정 작업 지시서

## 목표
무한 스크롤 API가 500을 반환하는 문제를 해결한다. 커서 포맷과 SQL 파라미터를 **완전히 일치**시키고, 잘못된 커서 입력 시 400으로 처리한다.

## 원인 요약
- 커서를 **JSON `{ts, id}` 기반으로 변경**했으나, 서버는 여전히 `createdAt` 문자열 커서를 기대하는 로직이 섞여 있음.
- 결과적으로 SQL 파라미터가 `undefined`/`NaN`이 되어 `ER_WRONG_ARGUMENTS` 발생.

## 수정 범위
- `src/app/api/posts/route.ts`
- `src/app/page.tsx`
- `src/app/space/[render_model]/page.tsx`
- `src/components/PostList.tsx`

## 수정 방향 (숫자 커서 통일)
커서를 **epoch 초(UTC) + id**로 고정하고, 모든 인코딩/디코딩/SQL 비교를 동일 규칙으로 맞춘다.

---

## 구현 지시

### 1) 커서 인코딩/디코딩 함수 통일 (API)
`src/app/api/posts/route.ts`

- 인코딩: `{ ts: number, id: string }` JSON → base64url
- 디코딩: ts가 number인지 검증

```ts
function encodeCursor(ts: number, id: string): string {
  return Buffer.from(JSON.stringify({ ts, id })).toString('base64url');
}

function decodeCursor(cursor: string): { ts: number; id: string } | null {
  try {
    const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
    const parsed = JSON.parse(decoded);
    if (typeof parsed.ts !== 'number' || typeof parsed.id !== 'string') return null;
    return parsed;
  } catch {
    return null;
  }
}
```

### 2) SQL 비교 파라미터 수정
- 현재 `parsed.createdAt` 사용 로직을 **전부 `parsed.ts`로 변경**

```ts
AND (UNIX_TIMESTAMP(p.created_at) < ?
     OR (UNIX_TIMESTAMP(p.created_at) = ? AND p.id < ?))
```

```ts
params = [...spaceParam, parsed.ts, parsed.ts, parsed.id, limit + 1];
```

### 3) select 필드 정리
- SQL에서 `UNIX_TIMESTAMP(p.created_at) AS created_at_ts` 유지
- `nextCursor`는 `created_at_ts` 사용

```ts
const nextCursor = hasMore && lastRow
  ? encodeCursor(lastRow.created_at_ts, lastRow.id)
  : null;
```

### 4) SSR 페이지 커서 생성 통일
`src/app/page.tsx`, `src/app/space/[render_model]/page.tsx`
- 쿼리에 `UNIX_TIMESTAMP(p.created_at) AS created_at_ts` 추가
- 커서 생성 시 `created_at_ts` 사용

### 5) 클라이언트 방어 로직
`src/components/PostList.tsx`
- `res.ok` 확인 후 `data.items` 처리
- 실패 시 `setNextCursor(null)`로 무한 재요청 방지

```ts
if (!res.ok) {
  console.error('Failed to load more posts', await res.text());
  setNextCursor(null);
  return;
}
```

---

## 완료 기준
- `/api/posts?cursor=...`가 500 없이 정상 응답한다.
- 커서 포맷은 JSON `{ts,id}`로 일관된다.
- 잘못된 커서는 400을 반환한다.
- 무한 스크롤이 안정적으로 동작한다.
