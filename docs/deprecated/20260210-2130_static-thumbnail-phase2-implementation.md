# 정적 썸네일/OG 이미지 저장 2단계 구현 완료
작성일: 2026-02-10

## 구현 완료 항목

### 1. 데이터베이스
- ✅ `post_image_job` 테이블 추가 (scripts/init-db.mjs)
- ✅ 마이그레이션 스크립트 생성 (scripts/migrate-add-post-image-job.mjs)
- ✅ 인덱스 추가 (status+created_at, post_id)
- ✅ 운영 DB에 적용 완료

**테이블 구조:**
```sql
CREATE TABLE IF NOT EXISTS post_image_job (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  post_id CHAR(36) NOT NULL,
  kind ENUM('thumb','og') NOT NULL,
  status ENUM('pending','running','success','failed') NOT NULL DEFAULT 'pending',
  attempts INT NOT NULL DEFAULT 0,
  last_error VARCHAR(512) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_post_kind (post_id, kind),
  CONSTRAINT fk_post_image_job FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
)
```

### 2. 작업 큐 라이브러리
- ✅ `src/lib/image-job.ts` 구현
  - `enqueueImageJob()` - 단일 작업 생성
  - `enqueueAllImageJobs()` - thumb + og 작업 생성
  - `getPendingJobs()` - pending 작업 조회
  - `markJobAsRunning()` - 작업 실행 시작
  - `markJobAsSuccess()` - 작업 성공 처리
  - `markJobAsFailed()` - 작업 실패 처리
  - `retryJob()` - 작업 재시도
  - `getJob()` - 작업 조회
  - `getJobsByPostId()` - post의 모든 작업 조회

### 3. 업로드 시 자동 큐 적재
- ✅ `POST /api/posts` 수정
  - 모든 render_model (svg, canvas, three, shader)에서 작업 큐 적재
  - `enqueueAllImageJobs()` 호출 (비동기, 실패해도 업로드 성공)
  - thumb + og 2개 작업 자동 생성

### 4. 워커 스크립트
- ✅ `scripts/capture-image-queue.mjs` 구현
  - pending 작업 polling (배치 크기: 5)
  - 작업 상태 전환: pending → running → success/failed
  - 재시도 로직 (최대 3회)
  - 한 번 실행 모드 및 watch 모드 지원
  - Graceful shutdown (SIGINT, SIGTERM)

### 5. 이미지 바이너리 엔드포인트
- ✅ `GET /api/posts/[id]/image?kind=thumb|og` 구현
  - BLOB 데이터를 바이너리로 응답
  - `Content-Type: image/png`
  - 캐싱 헤더: `Cache-Control: public, max-age=86400, immutable`
  - ETag 지원 (SHA256 해시)

### 6. API 응답에 thumb_url 추가
- ✅ `GET /api/posts` 수정
  - `post_image` 테이블 LEFT JOIN
  - `has_thumb` 플래그로 존재 여부 확인
  - `thumb_url` 필드 추가 (`/api/posts/{id}/image?kind=thumb`)
- ✅ `PostListItem` 타입에 `thumb_url` 필드 추가

### 7. UI 정적 이미지 우선 렌더
- ✅ `RenderPreview` 컴포넌트 수정
  - `thumb_url`이 있으면 `<img>` 태그로 우선 렌더
  - 이미지 로드 실패 시 동적 렌더러로 fallback
  - `onError` 핸들러로 에러 처리

### 8. OG 이미지 연동
- ✅ `src/app/posts/[id]/opengraph-image.tsx` 수정
  - `post_image.og` 존재 시 바이너리 직접 응답
  - 없으면 기존 텍스트 기반 OG 생성 (fallback)

### 9. npm scripts 추가
- ✅ `db:migrate:jobs` - job 테이블 마이그레이션
- ✅ `capture:worker` - 워커 한 번 실행
- ✅ `capture:worker:watch` - 워커 계속 polling

## 사용 방법

### 초기 설정

```bash
# 마이그레이션 실행
npm run db:migrate:jobs

# Playwright 브라우저 설치 (Phase 1에서 완료했다면 생략)
npx playwright install chromium
```

### 워커 실행

```bash
# 한 번만 실행 (pending 작업 처리 후 종료)
npm run capture:worker

# 계속 polling (10초 간격, Ctrl+C로 종료)
npm run capture:worker:watch
```

### 테스트 흐름

1. **업로드 테스트**
   ```bash
   # 새 post 업로드 (API 호출 또는 에이전트 이용)
   # POST /api/posts
   ```

2. **작업 큐 확인**
   ```sql
   SELECT * FROM post_image_job WHERE post_id = '<post-id>';
   -- status='pending', attempts=0 확인
   ```

3. **워커 실행**
   ```bash
   npm run capture:worker
   ```

4. **캡처 완료 확인**
   ```sql
   -- job 상태 확인
   SELECT * FROM post_image_job WHERE post_id = '<post-id>';
   -- status='success' 확인

   -- 이미지 확인
   SELECT post_id, kind, mime, width, height, bytes
   FROM post_image
   WHERE post_id = '<post-id>';
   ```

5. **이미지 바이너리 테스트**
   ```bash
   curl -I "http://localhost:3000/api/posts/<post-id>/image?kind=thumb"
   # Content-Type: image/png
   # Cache-Control: public, max-age=86400, immutable
   ```

6. **UI 확인**
   - 피드에서 정적 이미지 렌더 확인
   - 개발자 도구에서 `<img>` 태그 확인
   - 이미지 로드 실패 시 동적 렌더러 fallback 확인

7. **OG 이미지 확인**
   ```bash
   curl -I "http://localhost:3000/posts/<post-id>/opengraph-image"
   # 바이너리 응답 확인
   ```

## 아키텍처

### 업로드 → 캡처 흐름

```
┌──────────────┐
│  POST /api/  │
│    posts     │
└──────┬───────┘
       │
       ├─ posts 테이블 저장
       ├─ post_* 테이블 저장
       │
       ├─ enqueueAllImageJobs(id)
       │  └─ post_image_job 2건 INSERT (thumb, og)
       │
       └─ 응답 반환 (즉시)

        ... (비동기 워커) ...

┌──────────────────┐
│ capture-image-   │
│  queue.mjs       │
│  (워커)          │
└─────────┬────────┘
          │
          ├─ getPendingJobs(5)
          │
          ├─ FOR EACH job:
          │   ├─ markJobAsRunning(job.id)
          │   ├─ capturePostImage({ postId, kind })
          │   │   └─ Playwright 캡처
          │   │       └─ savePostImage(...)
          │   │           └─ post_image INSERT
          │   │
          │   └─ markJobAsSuccess / Failed
          │
          └─ 10초 대기 후 반복 (watch 모드)
```

### 렌더링 우선순위

```
RenderPreview 컴포넌트

  ┌─ thumb_url 있음?
  │
  ├─ YES → <img src={thumb_url} onError={fallback} />
  │           │
  │           └─ 로드 성공 → 정적 이미지 렌더 ✅
  │           └─ 로드 실패 → 동적 렌더러 사용
  │
  └─ NO → 동적 렌더러 사용
           ├─ SvgRenderer
           ├─ CanvasRenderer
           ├─ ThreeRenderer
           └─ ShaderRenderer
```

## 배포 고려사항

### Vercel 환경에서의 제약

Vercel Serverless Functions는 Playwright/Chromium 실행이 불안정하므로, **캡처 워커는 별도 환경에서 실행**해야 합니다.

**권장 구성:**

1. **Vercel (프론트엔드 + API)**
   - Next.js 앱 배포
   - `/api/posts` 업로드 엔드포인트
   - `/api/posts/[id]/image` 바이너리 응답 엔드포인트
   - 작업 큐 적재만 수행

2. **별도 VM/컨테이너 (캡처 워커)**
   - Cloud Run, EC2, Digital Ocean 등
   - `capture-image-queue.mjs --watch` 실행
   - Playwright + Chromium 설치
   - DB 접근 권한 필요

### 환경 변수

캡처 워커에 필요한 환경 변수:

```bash
# DB 연결
DB_HOST=your-db-host
DB_PORT=3306
DB_USERNAME=your-user
DB_PASSWORD=your-password
DB_DATABASE=your-database

# 렌더 페이지 URL (워커가 접근할 수 있어야 함)
NEXT_PUBLIC_BASE_URL=https://your-domain.com
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

### 성능 최적화

1. **캐싱**
   - 이미지 바이너리 엔드포인트에 `Cache-Control` 설정 완료
   - CDN 앞단 배치 권장 (Cloudflare, CloudFront)

2. **DB 용량**
   - 이미지를 MEDIUMBLOB으로 DB에 저장
   - Post 증가 시 DB 용량 부담 가능
   - 추후 S3/R2 등 Object Storage 전환 검토

3. **워커 스케일링**
   - 배치 크기 조정: `BATCH_SIZE` 변수
   - 여러 워커 인스턴스 병렬 실행 가능 (UNIQUE 제약으로 중복 방지)

## 제한 사항 및 알려진 이슈

1. **Vercel 배포 시 캡처 불가**
   - 해결: 별도 워커 서버 구축 필수

2. **애니메이션 캡처 품질**
   - 현재는 800ms 대기 후 단일 프레임 캡처
   - 애니메이션에 따라 최적 타이밍 다를 수 있음

3. **캡처 실패 시 fallback**
   - 정적 이미지 없으면 동적 렌더러 사용
   - OG 이미지 없으면 텍스트 기반 OG 생성

4. **재시도 정책**
   - 최대 3회 재시도 후 실패 처리
   - 수동 재시도: `UPDATE post_image_job SET status='pending', attempts=0 WHERE id=?`

## 향후 개선 사항

1. **자동 백필**
   - 이미지가 없는 기존 post 자동 백필 스크립트
   - `npm run capture:backfill` 추가

2. **재캡처 API**
   - `POST /api/internal/recapture?postId=<id>`
   - 이미지 무효화 후 재생성

3. **Object Storage 전환**
   - S3, Cloudflare R2, Supabase Storage 등
   - DB 용량 절약 및 CDN 직접 연결

4. **이미지 압축**
   - PNG → WebP 변환
   - 품질/용량 최적화

5. **워커 모니터링**
   - 실패율, 처리 시간 메트릭
   - Slack/Discord 알림 연동

## 파일 목록

### 신규 생성
- `scripts/migrate-add-post-image-job.mjs`
- `scripts/capture-image-queue.mjs`
- `src/lib/image-job.ts`
- `src/app/api/posts/[id]/image/route.ts`

### 수정
- `scripts/init-db.mjs` - post_image_job 테이블 추가
- `src/app/api/posts/route.ts` - 작업 큐 적재, thumb_url 추가
- `src/types/post.ts` - PostListItem.thumb_url 필드 추가
- `src/components/renderers/RenderPreview.tsx` - 정적 이미지 우선 렌더
- `src/app/posts/[id]/opengraph-image.tsx` - post_image.og 바이너리 응답
- `package.json` - scripts 추가

## 참고 문서
- Phase 1 구현: `docs/20260210-2100_static-thumbnail-phase1-implementation.md`
- Phase 2 설계: `docs/20260210-2130_static-thumbnail-phase2-plan.md`
