# DB 타임스탬프 타임존 명확화 마이그레이션 작업 지시서

## 문제 요약
- DB에서 `created_at`, `updated_at`가 `2026-02-08 11:33:24` 형식으로 내려온다.
- 타임존 정보가 없어서 JS에서 `new Date()`가 **로컬 시간**으로 해석된다.
- 실제 UTC 값임에도 KST로 오해되어 **약 9시간 차이**가 발생한다.

## 목표
DB 타임스탬프를 **타임존이 명확한 형식**으로 저장/반환하여, 클라이언트가 UTC로 정확히 해석하도록 한다.

## 선택한 방향 (권장)
- DB에는 **UTC 유지**
- DB 레벨에서 타임존 정보를 포함한 **ISO 8601 문자열**로 반환
- 또는 컬럼 자체를 **TIMESTAMP(UTC) + ISO 변환 조회**로 일관화

## 작업 범위
- DB 스키마 및 컬럼 타입 점검
- 마이그레이션 스크립트 추가
- API 쿼리 수정 (필요 시)

## 구현 옵션

### 옵션 A: 조회 시 ISO 8601 UTC로 변환 (권장)
- DB 내부 값은 유지하되, SELECT 시 변환
- 예시 (MySQL):
  - `DATE_FORMAT(CONVERT_TZ(created_at, '+00:00', '+00:00'), '%Y-%m-%dT%H:%i:%sZ') AS created_at`
  - 또는 `UTC_TIMESTAMP`와 동일 포맷 사용

### 옵션 B: 컬럼 타입을 TIMESTAMP로 변경
- MySQL `TIMESTAMP`는 UTC 기준 저장/조회가 가능
- 단, 세션 time_zone에 영향 받으므로 반드시 세션을 UTC로 고정

### 옵션 C: DATETIME → 저장 시 UTC ISO 문자열로 저장
- `created_at`/`updated_at`를 문자열로 저장하는 방식
- 권장하지 않음 (정렬/인덱싱 불리)

## 마이그레이션 작업

### 1) 현재 컬럼 타입 확인
```sql
SHOW COLUMNS FROM posts LIKE 'created_at';
SHOW COLUMNS FROM posts LIKE 'updated_at';
```

### 2) 권장 변경안
- 컬럼은 유지하되, API 쿼리에서 ISO 변환하여 반환
- `created_at`, `updated_at`를 **UTC ISO (Z 포함)** 로 내려보내기

예시 쿼리 수정
```sql
SELECT
  ...,
  DATE_FORMAT(created_at, '%Y-%m-%dT%H:%i:%sZ') AS created_at,
  DATE_FORMAT(updated_at, '%Y-%m-%dT%H:%i:%sZ') AS updated_at
FROM posts;
```

### 3) 백필 필요 여부
- 이미 저장된 값이 UTC라면 **백필 불필요**
- 만약 로컬 시간으로 저장된 적이 있다면 별도 변환 필요

## API 수정 범위
- `src/app/api/posts/route.ts`
- `src/app/api/posts/[id]/route.ts`
- `src/app/page.tsx`, `src/app/space/[render_model]/page.tsx` (직접 DB 쿼리 시)

## 완료 기준
- API 응답의 `created_at`, `updated_at`가 `YYYY-MM-DDTHH:mm:ssZ` 형식으로 내려온다.
- 클라이언트에서 `new Date(iso)`가 **UTC 기준으로 정상 해석**된다.
- 상대/절대 시간 계산 오차가 사라진다.
