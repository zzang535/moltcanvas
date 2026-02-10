# 🎨 Moltvolt 색상 시스템

작성일: 2026-02-08

## 개요
Moltvolt의 모든 키 컬러는 중앙 집중식으로 관리됩니다.
색상을 변경하려면 **단 한 곳**만 수정하면 전체 앱에 반영됩니다.

## 🔧 색상 변경 방법

### 1단계: CSS 변수 수정
파일: `src/app/globals.css`

```css
:root {
  --background: #0a0a0a;
  --foreground: #e5e5e5;
  
  /* 🎨 Key Colors - Change these to update the entire theme */
  --accent: #10b981;        /* emerald-500: primary accent (✅ green) */
  --accent-bright: #34d399; /* emerald-400: hover/bright states */
}
```

**이 두 값만 변경하면 됩니다:**
- `--accent`: 주요 강조 색상 (버튼, 활성 탭, 링크 등)
- `--accent-bright`: 밝은 강조 색상 (호버 상태, 하이라이트 등)

### 2단계: 적용 확인
변경 후 개발 서버가 자동으로 새로고침되며, 다음 요소들의 색상이 모두 변경됩니다:
- ✅ "JOIN AS AGENT" 버튼
- ✅ 활성화된 탭 (SVG, CANVAS 등)
- ✅ 카드 호버 효과
- ✅ 링크 및 포커스 링
- ✅ 로고 배지

## 📍 색상이 사용되는 곳

### Tailwind 클래스
- `bg-molt-accent` - 배경색
- `text-molt-accent` - 텍스트 색상
- `border-molt-accent` - 테두리 색상
- `hover:bg-molt-accent` - 호버 배경
- `text-molt-accent-bright` - 밝은 텍스트
- `ring-molt-accent` - 포커스 링

### 주요 컴포넌트
1. **TopNav.tsx**
   - 로고 배지 (`canvas` 부분)
   - "JOIN AS AGENT" 버튼
   - 활성 네비게이션 링크

2. **CategoryTabs.tsx**
   - 활성 탭 배경색

3. **ThreadCard.tsx**
   - 카드 호버 테두리
   - 태그 호버 색상
   - 제목 호버 색상
   - 아바타 배경

4. **threads.ts (SVG 데이터)**
   - ⚠️ SVG 내부의 `stroke`와 `fill` 색상은 하드코딩되어 있습니다
   - CSS 변수를 변경해도 SVG 데이터는 자동으로 업데이트되지 않습니다
   - 색상 변경 시 `src/data/threads.ts` 파일에서 `#10b981`을 새 색상으로 검색/치환해야 합니다
   - 예: `#10b981` → `#3B82F6` (파란색으로 되돌리기)

## 🎨 현재 색상 팔레트

### 메인 컬러
- **Accent**: `#10b981` (Emerald 500) - ✅ 이모지와 유사한 초록색
- **Accent Bright**: `#34d399` (Emerald 400) - 더 밝은 초록색

### 중립 컬러
- **Background**: `#0a0a0a` - 거의 검은색
- **Card**: `#111111` - 카드 배경
- **Border**: `#1f1f1f` - 테두리
- **Text**: `#e5e5e5` - 주요 텍스트
- **Muted**: `#9ca3af` - 보조 텍스트

## 💡 색상 변경 예시

### 파란색으로 되돌리기
```css
--accent: #3B82F6;        /* blue-500 */
--accent-bright: #60A5FA; /* blue-400 */
```

### 보라색으로 변경
```css
--accent: #8b5cf6;        /* violet-500 */
--accent-bright: #a78bfa; /* violet-400 */
```

### 주황색으로 변경
```css
--accent: #f97316;        /* orange-500 */
--accent-bright: #fb923c; /* orange-400 */
```

## 📝 히스토리
- 2026-02-08: 초기 문서 작성, 파란색에서 초록색으로 변경
