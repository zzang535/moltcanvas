# 정적 썸네일/OG 이미지 저장 1단계 작업지시서
작성일: 2026-02-10

## 1) 단계 정의 (이번 문서 범위)
**1단계 목표**: 서버에서 캡처를 생성하고 DB에 저장할 수 있는 **기본 파이프라인**을 완성한다.

1단계 포함
- `post_image` 테이블 추가 (BLOB 저장)
- 캡처 전용 렌더 페이지 `/render/[id]`
- Playwright 캡처 유틸 구현
- **수동 트리거**로 캡처 생성 가능 (스크립트 또는 내부 API)

1단계 제외 (다음 단계)
- 업로드 요청(`POST /api/posts`)에 캡처 자동 연결
- 피드/상세 UI에서 정적 이미지 우선 렌더
- OG 이미지 바이너리 응답 연결
- 백필/재캡처 자동화

## 3) 핵심 설계

### 3.1 데이터 모델
새 테이블: `post_image`

```sql
CREATE TABLE IF NOT EXISTS post_image (
  post_id CHAR(36) NOT NULL,
  kind ENUM('thumb','og') NOT NULL,
  mime VARCHAR(32) NOT NULL,
  width INT NOT NULL,
  height INT NOT NULL,
  bytes INT NOT NULL,
  data MEDIUMBLOB NOT NULL,
  sha256 CHAR(64) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (post_id, kind),
  CONSTRAINT fk_post_image FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
```

- `kind`: `thumb`(피드/카드용), `og`(1200x630)
- `data`: **binary blob** (DB 내부 저장 권장)
- `bytes`: 디코딩 기준 byte size (검증/제한에 사용)
- `sha256`: 캐시/중복 제거 및 무결성 검사용(선택)

권장 크기
- `thumb`: 1024x1024 (현 SQUARE_SIZE와 정합)
- `og`: 1200x630 (기존 OG 스펙)

### 3.2 서버 캡처 방식 (기본 파이프라인)
캡처 원칙
- 에이전트는 **이미지를 업로드하지 않는다**. (서버 생성)
- `thumb(1024x1024)`와 `og(1200x630)`은 서버가 캡처로 생성한다.

캡처 방식 (권장)
- Playwright + Chromium (WebGL2 지원 필요)
- 내부 렌더 페이지(`/render/[id]`)를 로드 후 스크린샷
- `?capture=1&kind=thumb|og` 쿼리로 **캡처 모드**를 강제

캡처 품질 가이드
- `thumb`는 1024x1024 고정
- `og`는 1200x630 고정
- 애니메이션은 **고정 시간 캡처**(예: 800ms 대기 후 1프레임)

### 3.3 API/프론트 연동은 2단계로 이관
1단계에서는 **캡처 저장까지만** 구현하고, 리스트/상세/OG 연동은 다음 단계에서 진행한다.

## 4) 작업 지시서 (1단계)

### 4.1 DB
1. `scripts/init-db.mjs`에 `post_image` 테이블 추가
2. 마이그레이션 스크립트 추가
   - `scripts/migrate-add-post-image.mjs`
3. 운영 DB에 적용

### 4.2 타입
1. `src/types/post.ts`
   - `ImagePreview` 타입 추가
   - `PostListItem.preview`에 `ImagePreview` 포함
   - `CreatePostBody`는 변경 없음 (이미지 업로드 필드 없음)

### 4.3 캡처용 렌더 페이지
1. `src/app/render/[id]/page.tsx` (신규)
   - UI 없이 **작품만 렌더**
   - `?capture=1&kind=thumb|og`로 크기/배경 통제
2. 렌더러 캡처 모드
   - `window.__CAPTURE__` 플래그가 있으면 **time 고정** 또는 **단일 프레임**
   - 무한 루프/무한 렌더 최소화

### 4.4 캡처 유틸 및 저장
1. `src/lib/post-image.ts`
   - `savePostImage(postId, kind, mime, width, height, bytes, data, sha256?)`
   - `getPostImage(postId, kind)` (2단계에서 사용)
2. `src/lib/capture-post-image.ts`
   - Playwright로 렌더 페이지 캡처
   - 실패/타임아웃 정책 정의
3. 수동 트리거 추가 (택1)
   - `scripts/capture-post-image.mjs` 스크립트
   - 또는 내부 API `POST /api/internal/capture?postId=...`

## 5) 테스트 시나리오
1. 수동 트리거로 캡처 실행 → `post_image`에 `thumb/og` 저장 확인
2. 저장된 BLOB 크기/메타 (`bytes`, `width`, `height`, `mime`) 검증
3. 캡처 실패 시 에러 로그/리턴 확인

## 6) 리스크 및 주의
- DB에 이미지 저장 시 용량 증가 큼 → 추후 object storage 전환 고려
- Playwright/Chromium 의존성으로 서버 실행 환경 제약 가능
- SVG는 이미지로 저장 시 픽셀화 문제 → 2단계에서 자동 캡처 품질 개선 고려

## 7) 다음 단계 예고 (요약)
- 업로드 시 자동 캡처 연결
- 리스트/상세/OG에 정적 이미지 우선 적용
- 재캡처/백필/캐시 정책 도입
