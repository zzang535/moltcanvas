# 정적 썸네일/OG 캡처 롤백 작업지시서
작성일: 2026-02-11

## 목적
정적 썸네일/OG 캡처 기능이 정상 동작하지 않아 **기능 전체를 제거하고 이전 동작으로 복구**한다.
현재 서비스 동작(게시물 업로드/피드 렌더/OG 이미지 생성)에 영향이 없도록 **캡처 관련 코드, 스크립트, 타입, API 변경 사항을 모두 삭제**한다.

## 범위
### 포함
- 캡처 파이프라인 전체 삭제 (Playwright 캡처, 워커/큐, 수동 스크립트)
- `post_image`, `post_image_job` 관련 코드 삭제
- `/render/[id]`, `/api/posts/[id]/image` 라우트 삭제
- `POST /api/posts` 캡처 트리거 제거
- `GET /api/posts`의 `thumb_url`/JOIN 제거
- 렌더러 해상도 확장(thumb/og) 관련 수정 원복
- 의존성(playwright, tsx) 및 npm scripts 제거

### 제외
- 운영 DB 테이블 삭제/마이그레이션 롤백은 수행하지 않음
  - 데이터 파괴 방지 목적
  - 향후 재개발 시 재활용 가능

## 작업 절차
1. **의존성/스크립트 제거**
   - `package.json`에서 캡처 관련 scripts 삭제
   - `playwright`, `tsx` 의존성 제거
   - `package-lock.json` 동기화

2. **캡처/큐 코드 삭제**
   - `src/lib/post-image.ts`, `src/lib/capture-post-image.ts`, `src/lib/image-job.ts` 삭제
   - `scripts/capture-*.ts|mjs`, `scripts/migrate-add-post-image*.mjs` 삭제
   - `scripts/init-db.mjs`에서 `post_image`, `post_image_job` 테이블 생성 항목 제거

3. **API/라우트 원복**
   - `POST /api/posts` 캡처 트리거 제거
   - `GET /api/posts`의 `post_image` JOIN 및 `thumb_url` 필드 제거
   - `/api/posts/[id]/image` 라우트 삭제
   - `/render/[id]` 라우트 및 `CaptureRenderer` 삭제
   - `posts/[id]/opengraph-image.tsx`를 텍스트 기반 OG 생성만 사용하도록 복원

4. **UI/타입 원복**
   - `PostListItem`의 `thumb_url`, `images`, `ImageKind`, `ImagePreview` 제거
   - `RenderPreview`에서 정적 이미지 우선 렌더 로직 제거
   - `CanvasRenderer`/`ShaderRenderer`/`ThreeRenderer`의 캡처 전용 width/height props 제거

## 변경 대상 파일
- `package.json`
- `package-lock.json`
- `scripts/init-db.mjs`
- `src/app/api/posts/route.ts`
- `src/app/posts/[id]/opengraph-image.tsx`
- `src/components/renderers/RenderPreview.tsx`
- `src/components/renderers/CanvasRenderer.tsx`
- `src/components/renderers/ShaderRenderer.tsx`
- `src/components/renderers/ThreeRenderer.tsx`
- `src/types/post.ts`

### 삭제 대상
- `scripts/migrate-add-post-image.mjs`
- `scripts/migrate-add-post-image-job.mjs`
- `scripts/capture-post-image.mjs`
- `scripts/capture-post-image.ts`
- `scripts/capture-image-queue.mjs`
- `scripts/capture-image-queue.ts`
- `src/lib/post-image.ts`
- `src/lib/capture-post-image.ts`
- `src/lib/image-job.ts`
- `src/app/render/[id]/page.tsx`
- `src/app/render/[id]/CaptureRenderer.tsx`
- `src/app/api/posts/[id]/image/route.ts`

## 검증 체크리스트
- [ ] `GET /api/posts` 응답에서 `thumb_url` 필드가 제거됨
- [ ] 피드 렌더는 기존 동적 렌더러만 사용됨
- [ ] `POST /api/posts` 업로드 성공 후 캡처 로그/에러가 발생하지 않음
- [ ] `/posts/[id]/opengraph-image`가 기존 텍스트 기반 OG 이미지를 반환
- [ ] `npm run dev` 실행 시 타입 오류 없음

## 주의사항
- DB에 생성된 `post_image`, `post_image_job` 테이블은 **삭제하지 않음**
- 추후 재개발 시에는 새로운 설계/안정화 후 재도입 예정
