# 정적 썸네일/OG 이미지 저장 2단계 설계 & 작업지시서
작성일: 2026-02-10

## 1) 목표
- 업로드 이후 자동으로 캡처를 생성하고, 피드/상세/OG에서 정적 이미지를 우선 사용한다.
- Vercel 배포 환경 제약을 고려해 **캡처 워커 분리**를 기본 전제로 한다.

## 2) 범위
포함
- 캡처 자동화(업로드 후 작업 큐/워커 기반)
- 썸네일/OG 이미지 바이너리 응답 엔드포인트
- 피드/상세 UI에서 정적 이미지 우선 렌더
- OG 이미지 바이너리 연결

제외
- object storage 전환
- 이미지 리사이즈/압축 파이프라인 고도화
- 대규모 백필(별도 배치로 수행)

## 3) 핵심 설계

### 3.1 캡처 자동화 구조 (권장)
**권장: 작업 큐 + 외부 워커**
- Vercel 서버리스에서 Playwright 실행이 불안정하므로, 캡처는 별도 VM/컨테이너에서 수행
- 업로드 시 DB에 작업 레코드 생성 → 워커가 polling하여 캡처 실행

#### 3.1.1 테이블: post_image_job
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
) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
```

#### 3.1.2 업로드 흐름
1. `POST /api/posts` 성공
2. `post_image_job`에 `thumb/og` 2건 upsert
3. 응답은 즉시 반환 (캡처 비동기)

#### 3.1.3 워커 흐름 (스크립트/서비스)
- `status='pending'`을 일정 개수 가져와 `running`으로 갱신 (락)
- `capturePostImage()` 실행 후 `post_image` 저장
- 성공 시 `status='success'`, 실패 시 `status='failed'` + `attempts++`

### 3.2 이미지 제공 방식
- **바이너리 엔드포인트**로 제공 (JSON 응답에 base64 포함 지양)

권장 엔드포인트
- `GET /api/posts/[id]/image?kind=thumb|og`
  - `Content-Type: image/png`
  - `Cache-Control: public, max-age=86400, immutable`

### 3.3 API/프론트 연동
- `GET /api/posts` 응답에 `thumb_url` 추가
  - 예: `${BASE_URL}/api/posts/${id}/image?kind=thumb`
- 상세 페이지에서도 `thumb_url` 활용 (상단 썸네일 우선)

### 3.4 OG 이미지
- `src/app/posts/[id]/opengraph-image.tsx` 수정
  - `post_image`의 `og` 존재 시 바이너리 응답
  - 없으면 기본 텍스트 OG (fallback)

## 4) 작업 지시서

### 4.1 DB
1. `scripts/init-db.mjs`에 `post_image_job` 테이블 추가
2. 마이그레이션 추가
   - `scripts/migrate-add-post-image-job.mjs`

### 4.2 업로드 시 큐 적재
1. `src/app/api/posts/route.ts`
   - 게시물 저장 후 `post_image_job`에 `thumb/og` upsert
   - 실패 시 로그만 남기고 업로드 응답은 성공 유지 (비동기)

### 4.3 워커/스크립트
1. `scripts/capture-image-queue.mjs` (신규)
   - pending job 조회 → running 전환 → 캡처 실행 → status 갱신
2. 재시도 정책
   - `attempts < 3`까지만 재시도

### 4.4 이미지 바이너리 엔드포인트
1. `src/app/api/posts/[id]/image/route.ts` (신규)
   - `kind` 쿼리 파라미터 검사
   - `getPostImage()`로 BLOB 조회 → 바이너리 응답

### 4.5 피드/상세 UI
1. `src/app/api/posts/route.ts` (GET)
   - `thumb_url` 필드 추가
2. `RenderPreview`/`ThreadCard`/`PostDetail`
   - `thumb_url` 있으면 `<img>` 우선 렌더
   - 없으면 기존 렌더러 fallback

### 4.6 OG
1. `src/app/posts/[id]/opengraph-image.tsx`
   - `getPostImage(id, 'og')`로 바이너리 응답
   - 없으면 기존 `ImageResponse` 유지

## 5) 테스트 시나리오
1. 업로드 → `post_image_job`에 2건 생성 확인
2. 워커 실행 → `post_image` 생성 확인
3. `/api/posts/[id]/image?kind=thumb` 바이너리 응답 확인
4. 피드 카드에서 정적 이미지 렌더 확인
5. `/posts/[id]/opengraph-image`에서 바이너리 반환 확인

## 6) 리스크
- Vercel 환경에서 캡처 불가 → 워커 분리 필수
- 이미지 바이너리 응답 시 캐싱 정책 미정 → CDN/ETag 필요 가능
- 캡처 실패 시 fallback 정책 필요 (기본 이미지 vs 텍스트 OG)

## 7) 오픈 질문
1. 워커 운영 환경: 로컬 VM, Cloud Run, EC2 중 어디?
2. 실패 시 UI/OG fallback 이미지 정책
3. `thumb_url` 스키마 확정 (API vs CDN)
