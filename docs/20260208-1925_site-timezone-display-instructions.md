# 사이트 설정 국가 시간 표시 작업 지시서

## 목표
사이트에서 선택된 국가/로케일 기준의 **시간대(time zone)** 로 날짜·시간이 표시되도록 구현한다. 브라우저 시간대가 아니라 **사이트 설정 값**을 우선 적용한다.

## 문제 요약
- 현재 날짜/시간 표시는 브라우저 시간대 기준으로 렌더링된다.
- 사이트에서 언어/국가를 설정해도 시간대가 반영되지 않는다.

## 요구 사항
1. 사이트 설정에 따라 시간대가 결정된다.
2. 시간 표시 컴포넌트는 **선택된 시간대**를 사용한다.
3. 언어(로케일)과 시간대는 함께 관리 가능해야 한다.

## 적용 범위
- 날짜/시간 표시 컴포넌트 (예: `LocalTime`)
- 언어/로케일 선택 UI (예: `LanguageSwitcher`)
- 전역 로케일 상태 관리 (`LanguageContext`, `i18n` 유틸)

## 설계 방향

### 1) 로케일 + 시간대 설정 분리
- 단순 언어(`en`, `ko`)만으로는 시간대를 결정할 수 없음
- **LocaleConfig** 구조로 확장
  - `lang`: UI 언어
  - `label`: 사용자 노출 라벨
  - `timeZone`: IANA Time Zone (예: `Asia/Seoul`)

예시
```ts
const LOCALES = [
  { id: "en-US", lang: "en", label: "EN (US)", timeZone: "America/New_York" },
  { id: "ko-KR", lang: "ko", label: "KO (KR)", timeZone: "Asia/Seoul" },
  { id: "ja-JP", lang: "ja", label: "JA (JP)", timeZone: "Asia/Tokyo" },
  { id: "zh-CN", lang: "zh", label: "ZH (CN)", timeZone: "Asia/Shanghai" },
];
```

### 2) 로케일 저장/복원
- `localStorage`에 `molt_locale` 또는 `molt_timezone` 저장
- 우선순위: **사용자 설정(locale/timezone) > 브라우저 언어/시간대**
- 브라우저 값 폴백은 `navigator.language` + `Intl.DateTimeFormat().resolvedOptions().timeZone` 사용

### 3) LocalTime 컴포넌트 수정
- `Intl.DateTimeFormat` 호출 시 `timeZone` 옵션을 명시
- 전역 컨텍스트에서 `timeZone`을 받아 적용

```ts
new Intl.DateTimeFormat(lang, {
  timeZone,
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
})
```

### 4) UI 연동
- 기존 `LanguageSwitcher`를 **LocaleSwitcher**로 확장
- 사용자 선택 시 `lang`과 `timeZone` 동시 변경
- 변경 즉시 전역 상태 업데이트

## 구현 단계
1. `src/lib/i18n.ts`에 로케일/타임존 설정 구조 추가
2. `LanguageContext`에 `timeZone` 포함 및 저장 로직 추가
3. `LocalTime`에서 `timeZone` 적용
4. 언어 선택 UI에 로케일/타임존 옵션 추가
5. 화면에서 시간 표시가 사이트 설정 기준으로 바뀌는지 확인

## 완료 기준
- 사이트 설정 로케일을 변경하면 **시간대가 즉시 반영**된다.
- 브라우저 시간대와 무관하게 **사이트 설정 국가 시간**이 표시된다.
- 새로고침 후에도 선택값이 유지된다.
