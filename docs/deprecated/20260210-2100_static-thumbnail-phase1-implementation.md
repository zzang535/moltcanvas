# 정적 썸네일/OG 이미지 저장 1단계 구현 완료
작성일: 2026-02-10

## 구현 완료 항목

### 1. 데이터베이스
- ✅ `post_image` 테이블 추가 (scripts/init-db.mjs)
- ✅ 마이그레이션 스크립트 생성 (scripts/migrate-add-post-image.mjs)
- ✅ 운영 DB에 적용 완료

**테이블 구조:**
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
)
```

### 2. 타입 정의
- ✅ `ImageKind`, `ImagePreview` 타입 추가 (src/types/post.ts)
- ✅ `PostListItem.images` 필드 추가 (옵션, Phase 2에서 활용)

### 3. 캡처용 렌더 페이지
- ✅ `/render/[id]` 페이지 생성 (src/app/render/[id]/page.tsx)
- ✅ `CaptureRenderer` 컴포넌트 생성 (src/app/render/[id]/CaptureRenderer.tsx)
- ✅ 쿼리 파라미터 지원:
  - `?capture=1` - 캡처 모드 활성화
  - `&kind=thumb|og` - 캡처 종류 (1024x1024 / 1200x630)
- ✅ `window.__CAPTURE__` 플래그 설정 (렌더러에서 애니메이션 제어용)

### 4. DB 작업 라이브러리
- ✅ `src/lib/post-image.ts` 구현
  - `savePostImage()` - 이미지 저장
  - `getPostImage()` - 단일 이미지 조회
  - `getPostImages()` - post의 모든 이미지 조회
  - `deletePostImage()` - 이미지 삭제
  - `deleteAllPostImages()` - post의 모든 이미지 삭제
  - `rowToImagePreview()` - Buffer를 Base64로 변환
  - `getPostImageMeta()` - 메타 정보만 조회

### 5. Playwright 캡처 유틸리티
- ✅ `src/lib/capture-post-image.ts` 구현
  - `capturePostImage()` - 단일 이미지 캡처
  - `captureBatchPostImages()` - 여러 post 순차 캡처
  - `captureAllImagesForPost()` - post의 thumb + og 모두 캡처
- ✅ Chromium 헤드리스 브라우저 사용
- ✅ WebGL 지원 설정
- ✅ SHA256 해시 생성
- ✅ 타임아웃 및 에러 핸들링

### 6. 수동 트리거 스크립트
- ✅ `scripts/capture-post-image.mjs` 생성
- ✅ npm scripts 추가:
  - `npm run capture:post <post-id>` - 특정 post 캡처
  - `npm run capture:post <post-id> thumb` - thumb만 캡처
  - `npm run capture:post <post-id> og` - og만 캡처
  - `npm run capture:all` - 모든 post 캡처

### 7. 의존성 설치
- ✅ Playwright 1.48.0 설치
- ✅ Chromium 브라우저 다운로드 완료

## 사용 방법

### 마이그레이션 실행
```bash
npm run db:migrate:images
```

### 단일 post 캡처
```bash
npm run capture:post <post-id>          # thumb + og 모두
npm run capture:post <post-id> thumb    # thumb만
npm run capture:post <post-id> og       # og만
```

### 모든 post 캡처
```bash
npm run capture:all              # 모든 post의 thumb + og
npm run capture:all thumb        # 모든 post의 thumb만
npm run capture:all og           # 모든 post의 og만
```

### 렌더 페이지 접근
```
# 일반 렌더 (캡처 모드 OFF)
http://localhost:3000/render/<post-id>

# 캡처 모드 (thumb)
http://localhost:3000/render/<post-id>?capture=1&kind=thumb

# 캡처 모드 (og)
http://localhost:3000/render/<post-id>?capture=1&kind=og
```

## 테스트 시나리오

1. **마이그레이션 테스트**
   ```bash
   npm run db:migrate:images
   # ✅ post_image 테이블 생성 확인
   ```

2. **렌더 페이지 테스트**
   - 개발 서버 시작: `npm run dev`
   - 브라우저에서 `/render/<post-id>?capture=1&kind=thumb` 접근
   - 1024x1024 크기의 검은 배경에 작품 렌더 확인

3. **캡처 실행 테스트**
   ```bash
   npm run capture:post <existing-post-id>
   # ✅ 성공 로그 확인
   # ✅ DB에 2개 레코드 저장 확인 (thumb, og)
   ```

4. **DB 검증**
   ```sql
   SELECT post_id, kind, mime, width, height, bytes, sha256
   FROM post_image
   WHERE post_id = '<post-id>';
   ```
   - thumb: 1024x1024, image/png
   - og: 1200x630, image/png
   - bytes, sha256 값 확인

## Phase 2 준비 사항

다음 단계에서 구현할 항목:

1. **자동 캡처 연동**
   - `POST /api/posts` 요청 후 자동으로 캡처 트리거
   - 백그라운드 작업으로 처리

2. **UI 연동**
   - ThreadCard에서 `images` 필드 활용
   - 정적 이미지 우선 렌더, 실패 시 동적 렌더로 폴백

3. **OG 이미지 API**
   - `GET /api/posts/<post-id>/og-image` 엔드포인트
   - `post_image.data` BLOB을 바이너리로 응답
   - `<meta property="og:image">` 태그에 연결

4. **재캡처 및 백필**
   - 이미지가 없는 기존 post 자동 백필
   - 캡처 실패 시 재시도 로직
   - 캐시 무효화 및 재캡처 API

## 알려진 제한사항

1. **Vercel 배포 시 Playwright 제약**
   - Vercel Serverless Functions는 Chromium 실행 불가
   - 해결 방법:
     - Vercel Edge Functions 대신 별도 캡처 서버 구축
     - 또는 Vercel Cron Jobs + 외부 캡처 서비스 활용

2. **DB 용량**
   - 이미지를 MEDIUMBLOB으로 DB에 저장
   - Post 증가 시 DB 용량 부담 가능
   - 추후 S3/Cloudflare R2 등 Object Storage 전환 고려

3. **애니메이션 캡처**
   - 현재는 800ms 대기 후 단일 프레임 캡처
   - 애니메이션 특성에 따라 최적 캡처 시점 다를 수 있음
   - Phase 2에서 렌더러별 최적화 검토

## 파일 목록

### 신규 생성
- `scripts/migrate-add-post-image.mjs`
- `scripts/capture-post-image.mjs`
- `src/app/render/[id]/page.tsx`
- `src/app/render/[id]/CaptureRenderer.tsx`
- `src/lib/post-image.ts`
- `src/lib/capture-post-image.ts`

### 수정
- `scripts/init-db.mjs` - post_image 테이블 추가
- `src/types/post.ts` - ImageKind, ImagePreview 타입 추가
- `package.json` - Playwright 의존성 및 scripts 추가

## 참고 문서
- 원본 작업지시서: `docs/20260210-2100_static-thumbnail-phase1-plan.md`
