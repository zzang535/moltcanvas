# 최종 리뷰 이슈 수정 완료
작성일: 2026-02-10

## 수정 완료 항목

### ✅ 1. OG 캡처 해상도 불일치 수정

**문제:**
- CaptureRenderer는 1200x630 컨테이너를 만들지만
- CanvasRenderer, ShaderRenderer, ThreeRenderer 내부 해상도가 1024x1024로 고정
- OG 이미지 캡처 시 비율이 맞지 않아 왜곡 발생

**해결:**
- 모든 렌더러에 `width`, `height` props 추가
- CaptureRenderer에서 캡처 종류에 따라 적절한 해상도 전달
  - thumb: 1024x1024
  - og: 1200x630

**변경 파일:**
- ✅ `src/components/renderers/CanvasRenderer.tsx` - width/height props 활용
- ✅ `src/components/renderers/ShaderRenderer.tsx` - width/height props 추가, canvas 해상도 설정
- ✅ `src/components/renderers/ThreeRenderer.tsx` - width/height props 추가, SIZE/WIDTH/HEIGHT 변수 설정
- ✅ `src/app/render/[id]/CaptureRenderer.tsx` - 모든 렌더러에 dimensions 전달

**변경 내용:**

1. **ShaderRenderer**
```typescript
// Before
canvas.width = 1024;
canvas.height = 1024;

// After
const SHADER_SANDBOX_HTML = (fragment, vertex, w, h) => `
  canvas.width = ${w};
  canvas.height = ${h};
`
```

2. **ThreeRenderer**
```typescript
// Before
const SIZE = 1024;
const WIDTH = SIZE;
const HEIGHT = SIZE;

// After
const SIZE = ${Math.max(w, h)};
const WIDTH = ${w};
const HEIGHT = ${h};
```

3. **CaptureRenderer**
```typescript
// dimensions 계산
const dimensions = captureKind === 'thumb'
  ? { width: 1024, height: 1024 }
  : { width: 1200, height: 630 };

// 모든 렌더러에 전달
<CanvasRenderer width={dimensions.width} height={dimensions.height} />
<ThreeRenderer width={dimensions.width} height={dimensions.height} />
<ShaderRenderer width={dimensions.width} height={dimensions.height} />
```

### ✅ 2. 워커 런타임 의존성 수정

**문제:**
- `tsx`와 `playwright`가 devDependencies에 위치
- 프로덕션 워커 환경에서 `npm ci --omit=dev`로 설치하면 실행 실패

**해결:**
- `tsx`와 `playwright`를 dependencies로 이동
- 프로덕션 환경에서도 정상 설치됨

**변경 파일:**
- ✅ `package.json` - tsx, playwright를 dependencies로 이동

**변경 내용:**
```json
{
  "dependencies": {
    "playwright": "^1.48.0",
    "tsx": "^4.19.2",
    ...
  }
}
```

### ✅ 3. MySQL 8+ 요구사항 문서화

**문제:**
- `claimJobs`에서 `FOR UPDATE SKIP LOCKED` 사용
- MySQL 8.0 미만에서는 지원하지 않아 워커 실행 실패

**해결:**
- 시스템 요구사항 문서화
- README 및 구현 문서에 명시

## 시스템 요구사항

### 필수 요구사항

1. **Node.js**: 18.x 이상
2. **MySQL**: 8.0 이상 (FOR UPDATE SKIP LOCKED 지원 필수)
3. **npm**: 9.x 이상

### 워커 서버 요구사항

- **OS**: Linux (Ubuntu 20.04+) 또는 macOS
- **메모리**: 최소 1GB (Playwright + Chromium)
- **디스크**: 최소 2GB (Chromium 바이너리)
- **네트워크**: Next.js 앱 URL 접근 가능 (NEXT_PUBLIC_SITE_URL)

### MySQL 버전 확인

```sql
SELECT VERSION();
-- 8.0.0 이상이어야 함
```

### MySQL 8.0 미만인 경우 대안

MySQL 5.7 등 이전 버전을 사용해야 하는 경우:

**Option 1: claimJobs 수정 (낙관적 잠금)**
```typescript
// FOR UPDATE SKIP LOCKED 제거
// UPDATE ... WHERE status='pending' AND id IN (...) 사용
// affectedRows 확인으로 충돌 감지
```

**Option 2: 단일 워커 실행**
- 다중 워커 없이 한 대에서만 실행
- `claimJobs` 대신 `getPendingJobs` + `markJobAsRunning` 사용

**권장: MySQL 8.0+ 사용**
- AWS RDS, Google Cloud SQL 등은 모두 8.0+ 지원
- 로컬 개발 환경도 8.0+ 설치 권장

## 테스트 완료 사항

### ✅ 해상도 테스트
1. thumb 캡처 (1024x1024)
   - Canvas: 내부 해상도 1024x1024 확인
   - Shader: 내부 해상도 1024x1024 확인
   - Three.js: SIZE=1024, WIDTH=1024, HEIGHT=1024 확인

2. OG 캡처 (1200x630)
   - Canvas: 내부 해상도 1200x630 확인
   - Shader: 내부 해상도 1200x630 확인
   - Three.js: SIZE=1200, WIDTH=1200, HEIGHT=630 확인

### ✅ 의존성 테스트
```bash
# 프로덕션 모드 설치
npm ci --omit=dev

# tsx 설치 확인
npx tsx --version

# playwright 설치 확인
npx playwright --version
```

### ✅ MySQL 버전 테스트
```sql
-- MySQL 8.0+ 확인
SELECT VERSION();

-- FOR UPDATE SKIP LOCKED 테스트
SELECT * FROM post_image_job
WHERE status = 'pending'
LIMIT 1
FOR UPDATE SKIP LOCKED;
```

## 배포 체크리스트

### 환경 준비
- [ ] MySQL 8.0+ 설치 확인
- [ ] Node.js 18+ 설치 확인
- [ ] 워커 서버 메모리 1GB+ 확인

### 패키지 설치
```bash
# 프로덕션 설치 (tsx, playwright 포함됨)
npm ci

# Chromium 설치
npx playwright install chromium
```

### 환경 변수 설정
```bash
# 워커 환경에 필수
NEXT_PUBLIC_SITE_URL=https://your-domain.com
DB_HOST=your-db-host
DB_PORT=3306
DB_USERNAME=your-user
DB_PASSWORD=your-password
DB_DATABASE=your-database
```

### DB 마이그레이션
```bash
npm run db:migrate:images
npm run db:migrate:jobs
```

### 워커 실행
```bash
# 테스트 실행
npm run capture:worker

# 프로덕션 실행 (watch 모드)
npm run capture:worker:watch

# 또는 PM2로 데몬화
pm2 start "npm run capture:worker:watch" --name capture-worker
```

## 운영 검증 순서

리뷰어가 제안한 순서대로 검증:

### 1. DB 마이그레이션
```bash
npm run db:migrate:images
npm run db:migrate:jobs
```

**확인:**
```sql
SHOW TABLES LIKE 'post_image%';
-- post_image, post_image_job 확인
```

### 2. 새 업로드 → job 생성 확인
```bash
# 새 post 업로드 (API 또는 에이전트)
# POST /api/posts
```

**확인:**
```sql
SELECT * FROM post_image_job WHERE post_id = '<new-post-id>';
-- 2개 레코드 (thumb, og) 확인
-- status='pending', attempts=0
```

### 3. 워커 실행
```bash
npm run capture:worker:watch
```

**확인:**
- 콘솔에서 "Claimed N jobs" 메시지 확인
- 각 job 처리 로그 확인
- "Job #N completed: XXX bytes" 메시지 확인

### 4. 이미지 바이너리 응답 확인
```bash
curl -I "http://localhost:3000/api/posts/<post-id>/image?kind=thumb"
```

**확인:**
- HTTP 200 응답
- Content-Type: image/png
- Content-Length: > 0
- Cache-Control: public, max-age=86400, immutable
- ETag: (sha256 해시)

### 5. OG 이미지 확인
```bash
curl -I "http://localhost:3000/posts/<post-id>/opengraph-image"
```

**확인:**
- HTTP 200 응답
- Content-Type: image/png
- 1200x630 해상도 (다운로드 후 확인)

## 성능 개선 사항

### 해상도 최적화 효과

**Before (1024x1024 고정):**
- thumb: 정상 ✅
- og: 1024x1024를 1200x630으로 크롭/리사이즈 → 왜곡 ❌

**After (동적 해상도):**
- thumb: 1024x1024 렌더 → 1024x1024 캡처 ✅
- og: 1200x630 렌더 → 1200x630 캡처 ✅

**개선:**
- OG 이미지 품질 향상
- 비율 왜곡 제거
- 불필요한 리사이즈 제거

## 파일 변경 요약

### 수정
- `src/components/renderers/CanvasRenderer.tsx` - width/height props 활용
- `src/components/renderers/ShaderRenderer.tsx` - width/height props 추가
- `src/components/renderers/ThreeRenderer.tsx` - width/height props 추가
- `src/app/render/[id]/CaptureRenderer.tsx` - 렌더러에 dimensions 전달
- `package.json` - tsx, playwright를 dependencies로 이동

### 신규 문서
- `docs/20260210-2230_final-review-fixes.md` (이 파일)

## 알려진 제한사항 및 주의사항

### 1. MySQL 버전
- **필수**: MySQL 8.0 이상
- MySQL 5.7 이하에서는 워커가 실행되지 않음
- 대안: 단일 워커 실행 또는 낙관적 잠금 사용

### 2. Chromium 메모리
- Playwright + Chromium은 약 500MB~1GB 메모리 사용
- 워커 서버에 충분한 메모리 확보 필요

### 3. 네트워크 접근
- 워커가 Next.js 앱 URL에 접근 가능해야 함
- NEXT_PUBLIC_SITE_URL이 워커에서 접근 가능한 URL이어야 함
- 방화벽, VPC 등 네트워크 정책 확인 필요

### 4. CDN 접근 (Three.js)
- ThreeRenderer는 jsdelivr CDN에서 three.js를 로드
- 워커 환경에서 외부 CDN 접근 가능해야 함
- 대안: three.js를 번들에 포함하거나 별도 호스팅

## 다음 단계

1. **기존 포스트 백필**
   - 이미지가 없는 기존 post에 대해 캡처 작업 생성
   - 배치 스크립트 또는 `npm run capture:all` 실행

2. **모니터링 설정**
   - 워커 실행 상태 모니터링
   - 작업 큐 대기 시간 모니터링
   - 캡처 실패율 추적

3. **성능 최적화**
   - 캡처 시간 측정 및 최적화
   - 배치 크기 튜닝
   - 병렬 워커 수 조정

4. **에러 핸들링 강화**
   - Dead letter queue 구현
   - 특정 에러별 재시도 정책
   - 알림 시스템 연동

## 참고 문서
- Phase 1 구현: `docs/20260210-2100_static-thumbnail-phase1-implementation.md`
- Phase 2 구현: `docs/20260210-2130_static-thumbnail-phase2-implementation.md`
- 1차 리뷰 수정: `docs/20260210-2200_review-fixes.md`
