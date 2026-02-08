# 시간 표기 상대/절대 토글 작업 지시서

## 목표
기본은 **상대 시간**으로 표시하고, 시간을 클릭하면 **절대 시간**으로 토글한다. 절대 시간 포맷은 **현재 언어 설정**에 맞게 표시한다.

## 요구 사항
1. 기본 표시는 상대 시간 (예: `5m ago`, `2h ago`, `Yesterday`).
2. 시간 클릭 시 절대 시간으로 토글 (다시 클릭하면 상대 시간으로 복귀).
3. 절대 시간은 현재 언어/로케일 설정에 따라 포맷.
4. 토글 상태는 페이지 내에서만 유지 (새로고침 시 기본 상대 시간).

## 적용 범위
- 날짜/시간 표시 컴포넌트: `src/components/LocalTime.tsx`
- 시간 표시가 있는 모든 화면 (목록/상세)

## 구현 방향

### 1) 상대 시간 포맷
- `Intl.RelativeTimeFormat` 사용 권장
- 기준: 현재 시각과 `iso` 간 차이 계산
- 단위 우선순위: seconds → minutes → hours → days → weeks → months → years
- 예시 결과:
  - 45초 이내: `just now`
  - 1~59분: `x min ago`
  - 1~23시간: `x hr ago`
  - 1~6일: `x day(s) ago`
  - 7일 이상: `x week(s) ago`

### 2) 절대 시간 포맷
- 기존 `Intl.DateTimeFormat` 활용
- 언어/로케일은 전역 설정 값을 사용
- 예시 옵션
  - `month: 'short'`
  - `day: 'numeric'`
  - `hour: '2-digit'`
  - `minute: '2-digit'`
  - `hour12` 여부는 locale 기본 사용

### 3) 토글 구현
- `LocalTime` 내부에 로컬 state 추가
  - `const [mode, setMode] = useState<'relative' | 'absolute'>('relative')`
- 클릭 이벤트로 토글
- 접근성: `button` 또는 `role="button"` + `aria-pressed`

### 4) 언어 설정 연동
- 절대 시간: `Intl.DateTimeFormat(currentLang, ...)`
- 상대 시간: `Intl.RelativeTimeFormat(currentLang, { numeric: 'auto' })`

## 구현 단계
1. `LocalTime`에 상대 시간 계산 로직 추가
2. `LocalTime`에 토글 state 및 클릭 핸들러 추가
3. 절대 시간 포맷을 언어 설정 기반으로 적용
4. UI에서 정상 토글 동작 확인

## 완료 기준
- 기본은 상대 시간으로 표시된다.
- 시간 클릭 시 절대 시간으로 전환된다.
- 절대 시간은 현재 언어 설정에 따라 표시된다.
- 다시 클릭하면 상대 시간으로 복귀한다.
