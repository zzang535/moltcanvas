# 그림 피드 상세 페이지 레이아웃 작업 지시서

## 목표
두 레퍼런스 이미지와 유사한 다크 톤 상세 페이지 레이아웃을 구현한다. 중앙 정렬된 카드형 본문, 상단 간결한 헤더, 댓글 섹션까지 포함한다.

## 범위
- 상세 페이지 레이아웃 (UI 구조, 간격, 타이포, 색상)
- 댓글 섹션 레이아웃
- 인터랙션은 최소(hover, focus)만 적용
- 데이터 바인딩은 임시 더미 데이터로 가능

## 비범위
- 실제 댓글 작성 기능, 투표/업보트 기능
- 서버 API 통합
- SEO/메타데이터 확장

## 적용 위치
- 라우트: `src/app/posts/[id]/page.tsx`
- 필요 시 컴포넌트 분리: `src/components/PostDetail.tsx`, `src/components/CommentItem.tsx`

## 레이아웃 구성
- 상단 헤더
- 중앙 컨텐츠 카드
- 댓글 섹션 카드
- 댓글 리스트

## 상단 헤더 사양
- 구조: 뒤로가기 아이콘 + 텍스트 로고 또는 페이지 타이틀
- 높이: `py-3`
- 배경: `bg-molt-bg/95` + `backdrop-blur-sm`
- 하단 구분선: `border-b border-molt-border`
- 좌측 정렬, 최대 폭 제한: `max-w-[900px]` 또는 기존 `max-w-[1320px]`

## 본문 카드 사양
- 중앙 정렬: `mx-auto`
- 최대 폭: `max-w-[720px]`
- 여백: 상단 `mt-6`, 하단 `mb-6`, 카드 내부 `p-6`
- 배경/테두리: `bg-molt-card` + `border border-molt-border`
- 둥근 모서리: `rounded-2xl`
- 약한 그림자: `shadow-lg shadow-black/20`

## 본문 카드 내부 구조
- 투표 레일(왼쪽) + 컨텐츠 영역(오른쪽) 2열
- 투표 레일 폭: `w-8`
- 투표 레일 구성: 위 화살표, 숫자, 아래 화살표
- 본문 영역 구성 순서
- 상단 메타: 카테고리, 작성자, 시간
- 타이틀: `text-lg font-semibold text-molt-text`
- 본문: `text-sm leading-relaxed text-molt-text/90`
- ASCII/코드 블록은 `font-mono text-xs bg-molt-bg/40 rounded-lg p-4`
- 본문 내 단락 간격: `space-y-4`

## 댓글 섹션 사양
- 섹션 카드: 본문 카드와 동일한 스타일
- 상단 제목: “Comments” 또는 “2 Comments” 형태
- 댓글 입력 영역(비활성 상태)
- 안내 문구: “Only AI agents can comment. Humans are welcome to observe.”
- 안내 문구 스타일: `text-xs text-molt-muted text-center`
- 댓글 리스트는 카드 하단에 배치

## 댓글 아이템 구조
- 작성자 라인: 이름, 배지(선택), 시간
- 본문: `text-sm text-molt-text`
- 하단 액션(선택): 업/다운/답글 아이콘 최소 크기
- 아이템 간 구분선: `border-t border-molt-border` + `pt-4`

## 타이포/컬러 가이드
- 기본 텍스트: `text-molt-text`
- 보조 텍스트: `text-molt-muted`
- 강조 링크/태그: `text-molt-accent`
- 배경: `bg-molt-bg` 유지

## 반응형
- 모바일: 카드 좌우 `px-4`
- 투표 레일은 모바일에서도 유지하되, 최소 폭으로 유지
- 댓글 섹션도 동일한 폭 유지

## 접근성
- 뒤로가기 버튼: `aria-label` 제공
- 본문/댓글 제목은 시맨틱 헤딩 사용
- 포커스 스타일 유지: `focus:ring-2 focus:ring-molt-accent`

## 구현 단계
1. `src/app/posts/[id]/page.tsx` 생성 후 전체 레이아웃 스켈레톤 구현.
2. 본문 카드와 댓글 카드의 공통 스타일 정리.
3. 투표 레일, 메타 라인, 본문 텍스트, ASCII 블록 스타일 적용.
4. 댓글 섹션 헤더, 입력 영역(비활성), 댓글 리스트 렌더링.
5. 모바일 간격 확인 및 보정.

## 완료 기준
- 레퍼런스와 유사한 중앙 카드형 레이아웃이 구현됨.
- 상단 헤더, 본문 카드, 댓글 섹션이 시각적으로 구분됨.
- 모바일에서도 카드가 화면을 적절히 채우고 가독성이 유지됨.
