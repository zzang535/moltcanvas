# 푸터 작업지시서 (Molt Hub 레퍼런스)
작성일: 2026-02-08

## 1) 목적
- 레퍼런스 이미지를 기반으로 한 **미니멀 다크 푸터**를 추가한다.
- 회사 정보(회사명/이메일/전화번호)를 명확하게 노출한다.

## 2) 범위
- 컴포넌트: 신규 `Footer` 컴포넌트
- 레이아웃: `src/app/layout.tsx`
- 스타일: Tailwind 유틸리티 (기존 `molt` 색상 토큰 활용)

## 3) 콘텐츠 요구사항
- 회사명: `singingbird`
- 이메일: `singingbird535@gmail.com`
- 전화번호: `010-2849-0490` (표기 통일)

## 4) 레이아웃 가이드 (레퍼런스 반영)
- 상단 여백을 충분히 둔 **단일 라인형 푸터**
- 중앙 정렬이 아닌 **좌측 로고/우측 정보** 분리 배치
- 어두운 배경과 낮은 대비 텍스트로 차분한 마무리

권장 구조
- 왼쪽: 브랜드 마크
  - `singingbird` 텍스트 로고
  - 보조 라벨(작은 칩 형태) 예: `hub`
- 오른쪽: 회사 정보 라인
  - `singingbird · singingbird535@gmail.com · 010-2849-0490`
- 하단에 얇은 구분선 또는 상단 보더 적용

## 5) 구현 지침

### 5.1 컴포넌트 생성
- 파일: `src/components/Footer.tsx`
- `Footer`는 시맨틱 `footer` 태그 사용
- 내부 컨테이너는 `max-w-[1320px]` + `mx-auto` + `px-4`

### 5.2 레이아웃 반영
- `src/app/layout.tsx`에서 `{children}` 하단에 `Footer` 추가

### 5.3 스타일 (Tailwind 기준)
- 배경: `bg-molt-bg` 또는 투명 + 상단 보더 `border-t border-molt-border`
- 텍스트: 기본 `text-molt-muted`, 강조는 `text-molt-text`
- 로고 칩: `bg-molt-accent text-black text-xs font-bold`
- 정렬: `flex items-center justify-between gap-6`
- 반응형: 모바일에서는 세로 정렬
  - `flex-col md:flex-row` 적용
  - 모바일에서는 정보 텍스트 중앙 정렬

## 6) 완료 기준
- 푸터가 모든 페이지 하단에 노출된다.
- 회사명/이메일/전화번호가 정확히 표시된다.
- 모바일/데스크탑 레이아웃이 자연스럽게 정렬된다.

## 7) 테스트 시나리오
1. 홈 화면 로드
2. 데스크탑 폭에서 좌우 분리 정렬 확인
3. 모바일 폭에서 세로 정렬 확인
4. 텍스트 오탈자/형식(전화번호 하이픈) 확인
