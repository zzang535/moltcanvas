# 무한 스크롤 500 오류 근본 해결을 위한 커서 설계 변경 작업 지시서

## 현상 요약
- 무한 스크롤 트리거 시 `GET /api/posts?limit=12&cursor=...`가 반복적으로 500을 반환.
- 클라이언트는 `Failed to fetch posts` 로그만 출력하며 원인 파악이 어려움.

## 근본 원인 분석
현재 커서가 **문자열 기반 날짜**를 사용한다.
- 커서: `base64("YYYY-MM-DD HH:mm:ss|uuid")`
- 서버 SQL: `p.created_at < ?` 에 문자열을 직접 바인딩

이 방식은 다음 문제를 유발한다.
1. **세션 타임존/포맷 의존성**
   - `created_at`이 TIMESTAMP인 경우 세션 time_zone에 따라 문자열 포맷 결과가 달라짐.
2. **포맷 변형/정렬 취약**
   - 문자열 비교/파싱은 DB/드라이버 환경에 따라 예외를 유발할 수 있음.
3. **오류가 발생해도 500만 반환**
   - 원인 데이터(특정 row)에서 실패하면 전체 페이지네이션이 중단됨.

따라서 **문자열 기반 커서 설계를 버리고, 숫자 기반 커서**로 재설계한다.

---

## 개선 설계 (핵심 변경)

### 1) 커서를 **epoch(UTC) + id** 구조로 고정
- 커서 데이터: `{ ts: number, id: string }`
- 인코딩: `base64url(JSON.stringify(cursor))`
- 비교: `UNIX_TIMESTAMP(p.created_at)` 기반 비교

### 2) SQL 비교를 **숫자 기반**으로 변경
```sql
WHERE p.status = 'published'
  AND (UNIX_TIMESTAMP(p.created_at) < ?
       OR (UNIX_TIMESTAMP(p.created_at) = ? AND p.id < ?))
```

### 3) 응답은 표시용 ISO (`created_at`, `updated_at`) 유지
- API 응답은 기존처럼 ISO 8601 (Z 포함)으로 유지
- 커서 전용 필드는 내부에서만 사용

---

## 수정 범위
- `src/app/api/posts/route.ts`
- `src/app/page.tsx`
- `src/app/space/[render_model]/page.tsx`
- `src/components/PostList.tsx`

---

## 상세 작업 지시

### A. API 커서 설계 변경
1. 쿼리에 `UNIX_TIMESTAMP(p.created_at) AS created_at_ts` 추가
2. 커서 인코딩 함수 변경
```ts
function encodeCursor(ts: number, id: string) {
  return Buffer.from(JSON.stringify({ ts, id })).toString('base64url');
}
```
3. 커서 디코딩 함수 변경
```ts
function decodeCursor(raw: string) {
  const parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
  if (typeof parsed.ts !== 'number' || typeof parsed.id !== 'string') return null;
  return parsed;
}
```
4. 커서 조건은 `UNIX_TIMESTAMP(p.created_at)` 기준으로 비교

### B. 페이지(SSR) 초기 커서 생성 변경
- `page.tsx`, `space/[render_model]/page.tsx`에서
  - `UNIX_TIMESTAMP(p.created_at) AS created_at_ts` 추가
  - `nextCursor = encodeCursor(lastRow.created_at_ts, lastRow.id)`

### C. PostList 무한스크롤 안정화
- `fetch` 응답 `res.ok` 체크 후 실패 시 재시도/중단
- 실패 시 `nextCursor = null`로 고정해 무한 오류 루프 방지

```ts
if (!res.ok) {
  setNextCursor(null);
  return;
}
```

---

## 안정성 강화 (권장)
1. **에러 응답 로깅 강화**
   - 커서 디코딩 실패 시 400 반환
   - DB 쿼리 실패 시 쿼리/params 일부 로깅
2. **태그 파싱 방어**
   - `parseTags`는 JSON.parse 실패 시 빈 배열 반환

---

## 완료 기준
- 무한 스크롤 호출 시 500 없이 다음 페이지 로딩이 지속된다.
- 커서 인코딩/디코딩이 DB/세션 타임존과 무관하게 동작한다.
- 오류 발생 시 클라이언트가 무한 재요청하지 않는다.
