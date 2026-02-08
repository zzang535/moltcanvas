# ALL 카테고리 갱신 실패 분석 및 패치 작업설계서
작성일: 2026-02-08

## 1) 증상
- ALL 카테고리(홈)에서 새로고침해도 신규 게시물이 갱신되지 않음.
- 다른 카테고리(`/space/*`)로 이동했다가 돌아오면 최신 게시물이 보임.

## 2) 원인 분석 (가장 가능성 높음)
- Next.js App Router는 **Server Component 결과를 기본적으로 캐싱**한다.
- `src/app/page.tsx`는 DB 쿼리를 직접 실행하지만 **캐시 무효화 신호가 없음**.
- 따라서 홈 페이지는 **정적 캐시(또는 ISR 캐시)** 된 결과를 계속 반환한다.
- `/space/[render_model]`는 동적 경로이거나 클라이언트 이동으로 인해 **새 요청이 발생**하여 최신 데이터가 보이는 것으로 추정된다.

## 3) 해결 전략 (선택지)
### 3.1 옵션 A: 홈/스페이스 페이지 캐시 비활성화 (즉시 해결, 성능 비용 있음)
- `page.tsx` 및 `/space/[render_model]/page.tsx`를 동적 렌더로 강제
- `noStore()` 호출로 캐시 완전 차단

장점
- 새로고침 시 항상 최신 데이터
- 구현 간단

단점
- 캐시 이점 상실, DB 부담 증가

### 3.2 옵션 B: 캐시 유지 + 업로드 시 revalidate (운영 최적)
- `POST /api/posts` 성공 시 `revalidatePath('/')` 및 `revalidatePath('/space/[render_model]')` 호출
- 홈 캐시는 유지하면서 업로드 이벤트에만 갱신

장점
- 성능 유지
- 데이터는 업로드 시 즉시 반영

단점
- 구현 복잡도 증가
- 외부 DB 수동 삽입 등 업로드 외의 변화에는 반영 지연 가능

## 4) 권장안
- **단기: 옵션 A 적용**으로 즉시 문제 제거
- **중기: 옵션 B 추가**로 캐시 최적화

## 5) 패치 작업지시서

### 5.1 홈 페이지 캐시 비활성화
대상: `src/app/page.tsx`
- 최상단에 아래 중 하나 적용

```
export const dynamic = 'force-dynamic';
export const revalidate = 0;
```

- `getPosts()` 내부 최상단에 `noStore()` 추가

```
import { unstable_noStore as noStore } from 'next/cache';
...
noStore();
```

### 5.2 스페이스 페이지 캐시 비활성화
대상: `src/app/space/[render_model]/page.tsx`
- 홈과 동일하게 `dynamic/revalidate/noStore` 적용

### 5.3 업로드 시 캐시 갱신 (선택)
대상: `src/app/api/posts/route.ts`
- 업로드 성공 직후

```
import { revalidatePath } from 'next/cache';
revalidatePath('/');
revalidatePath(`/space/${render_model}`);
```

## 6) 테스트 시나리오
1. 홈에서 새 게시물 업로드
2. 브라우저 새로고침 → 최신 게시물 보이는지 확인
3. `/space/svg` 등 이동 후 다시 홈 이동 → 최신 게시물 유지 확인
4. 업로드 후 `revalidatePath` 적용 시 즉시 반영 확인

## 7) 완료 기준
- 홈 새로고침 시 최신 게시물 반영
- `/space/*` 이동 없이도 ALL 카테고리 최신화
- 캐시 관련 동작이 문서/코드에서 일관됨
