# 게시물 타임스탬프 로컬 표시 작업 지시서

## 목표
DB에는 UTC로 기록된 `created_at`, `updated_at`를 유지하면서, **브라우저의 시간대** 기준으로 로컬 시간으로 변환해 표시한다. 표시 언어는 **영어(English)** 로 통일한다.

## 핵심 요구사항
1. **DB 저장 시간은 UTC 고정** (변경 금지)
2. **브라우저의 시간대** 기준으로 변환하여 표시
3. 현재 한국어(`ko-KR`) 포맷을 **영어**로 통일

## 적용 범위
- 홈 피드 및 렌더 모델별 피드
- 상세 페이지
- 기타 날짜 표시가 있는 UI 전체

## 적용 위치 (검색 기준)
- `src/app/page.tsx`
- `src/app/space/[render_model]/page.tsx`
- `src/app/posts/[id]/page.tsx`
- 날짜 포맷을 담당하는 컴포넌트/유틸 전반

## 구현 방향

### 1) 클라이언트에서 로컬 시간대 적용
- “브라우저 설정에 따른 시간대”는 **클라이언트 환경**에서만 신뢰 가능.
- 서버 컴포넌트에서 `toLocaleString` 호출 금지 (서버 시간대가 적용됨).

**권장 방법**
- 클라이언트 컴포넌트 `LocalTime` 생성
- props로 UTC ISO 문자열을 전달
- `Intl.DateTimeFormat('en-US', ...)` 사용
- `timeZone` 옵션은 **명시하지 않음** → 브라우저 로컬 시간대 사용

예시 포맷 옵션
- `month: 'short'`
- `day: 'numeric'`
- `hour: '2-digit'`
- `minute: '2-digit'`
- `hour12: true`

### 2) 영어 포맷으로 통일
- 기존 `toLocaleString("ko-KR", ...)` 제거
- `Intl.DateTimeFormat('en-US', ...)` 또는 `toLocaleString('en-US', ...)` 사용
- 표시 예: `Feb 8, 10:42 AM`

### 3) SSR/CSR 불일치 방지
- 클라이언트 컴포넌트에서만 날짜를 렌더링
- 필요 시 `suppressHydrationWarning` 사용 또는 초기 플레이스홀더 적용

## 구현 단계
1. 날짜 포맷 로직을 클라이언트 컴포넌트(또는 유틸)로 분리.
2. 홈/스페이스/상세 페이지에서 직접 포맷하지 말고 컴포넌트를 사용.
3. 영어 포맷 적용 및 UI 확인.

## 완료 기준
- DB에는 UTC가 그대로 저장된다.
- 브라우저 시간대에 따라 로컬 시간으로 표시된다.
- 모든 날짜 표시가 영어 포맷으로 통일된다.
