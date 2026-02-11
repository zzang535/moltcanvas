# 작품 상세 Star 기능 작업지시서

작성일: 2026-02-11

## 1) 목표
- 작품 상세 페이지의 Star UI를 실제 기능과 연결한다.
- 익명 사용자 기준으로 작품당 1회 Star만 허용하고, 다시 누르면 취소(unstar)되게 한다.
- 목록/상세에서 Star 수가 일관되게 보이도록 데이터 흐름을 정리한다.

## 2) 배경
- 현재 `PostDetail`에 Star 버튼 UI는 있으나 로컬 상태만 변경되고 서버 저장이 없다.
- 조회수는 쿠키 기반이 아닌 단순 증가 API로 동작 중이며, Star는 별도 식별자 기준이 필요하다.
- 로그인 시스템이 없으므로 브라우저 쿠키 기반 익명 식별(`viewer_id`)을 사용한다.

## 3) 범위
- DB 스키마 추가/마이그레이션
- Star 토글 API 구현
- 상세 페이지 Star UI를 서버 연동형으로 전환
- 목록/상세 Star 카운트 노출 정합성 맞춤

## 4) 비범위
- 계정 로그인/회원 시스템
- 알림, 활동 로그, 랭킹
- Star 수 기반 정렬(Hot 정렬)

## 5) 요구사항
- 같은 `viewer_id`는 같은 `post_id`에 Star를 최대 1개만 가질 수 있어야 한다.
- 같은 버튼을 다시 누르면 Star가 취소되어야 한다.
- 응답은 항상 최신 `star_count`와 `starred` 상태를 반환해야 한다.
- HTTPS 환경에서 쿠키는 `Secure`로 설정한다.
- 로컬 개발(`localhost`)에서는 `Secure=false` 분기를 둔다.

## 6) 구현 작업

### 6-1. DB 스키마
1. `posts` 테이블에 카운터 컬럼 추가
   - `star_count INT NOT NULL DEFAULT 0`
2. 사용자별 Star 관계 테이블 추가
   - 테이블명: `post_stars`
   - 컬럼:
     - `post_id CHAR(36) NOT NULL`
     - `viewer_id CHAR(36) NOT NULL`
     - `created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`
   - 제약:
     - `UNIQUE KEY uniq_post_viewer (post_id, viewer_id)`
     - `FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE`
   - 인덱스:
     - `INDEX idx_viewer_created_at (viewer_id, created_at)`

### 6-2. 마이그레이션/초기화 반영
1. `sql/create_posts_table.sql`에 `star_count`/`post_stars` 정의 반영
2. `scripts/init-db.mjs`에 동일 정의 반영
3. 신규 마이그레이션 스크립트 추가
   - 예: `scripts/migrate-add-post-stars.mjs`
4. `package.json` scripts에 실행 명령 추가
   - 예: `db:migrate:stars`

### 6-3. 식별자 쿠키 유틸
1. `viewer_id`를 읽거나 생성하는 유틸 추가
   - 예: `src/lib/viewer-id.ts`
2. 규칙
   - 값: `crypto.randomUUID()`
   - 쿠키 옵션:
     - `httpOnly: true`
     - `sameSite: 'lax'`
     - `path: '/'`
     - `maxAge`: 1년
     - `secure`: `process.env.NODE_ENV === 'production'`

### 6-4. Star API
1. 라우트 추가
   - `src/app/api/posts/[id]/star/route.ts`
2. `GET /api/posts/{id}/star`
   - 목적: 현재 사용자 기준 상태 조회
   - 응답:
     - `{ starred: boolean, star_count: number }`
3. `POST /api/posts/{id}/star`
   - 목적: 토글
   - 동작:
     1. `viewer_id` 확보(없으면 발급)
     2. 해당 `(post_id, viewer_id)` 존재 여부 확인
     3. 없으면 insert + `posts.star_count + 1`
     4. 있으면 delete + `posts.star_count - 1` (0 미만 방지)
     5. 최신 `star_count`, `starred` 반환
   - 응답:
     - `{ starred: boolean, star_count: number }`
4. 에러 처리
   - post 없음: `404`
   - 잘못된 id: `400`
   - 기타: `500`

### 6-5. 목록/상세 데이터 정합성
1. 목록 API(`src/app/api/posts/route.ts`)에 `star_count` 포함
2. 상세 데이터 로더(`src/lib/post-detail.ts`)에 `star_count` 포함
3. 타입 확장
   - `src/types/post.ts`의 `PostMeta`, `PostListItem`에 `star_count?: number` 추가

### 6-6. 프론트 연동 (`PostDetail`)
1. 현재 로컬 전용 토글 로직 제거
2. 초기 로드 시 `GET /api/posts/{id}/star` 호출해 `starred`, `star_count` 상태 동기화
3. 클릭 시 `POST /api/posts/{id}/star` 호출
4. UX:
   - 낙관적 업데이트(optimistic) 적용 가능
   - 실패 시 롤백
   - 요청 중 버튼 비활성화

## 7) 테스트 체크리스트
- [ ] 상세 진입 시 Star 수가 서버 값으로 표시된다.
- [ ] 첫 클릭: `starred=true`, 카운트 +1
- [ ] 두 번째 클릭: `starred=false`, 카운트 -1
- [ ] 같은 브라우저에서 새로고침해도 스타 상태 유지
- [ ] 다른 브라우저/시크릿 모드에서 별도 상태로 동작
- [ ] 목록 카드 Star 수와 상세 Star 수가 일치
- [ ] 게시물 삭제 시 `post_stars`가 cascade 삭제

## 8) 완료 기준
- 상세 Star 버튼이 서버 데이터 기반으로 동작한다.
- 익명 사용자 기준 1인 1Star 제약이 지켜진다.
- 목록/상세 카운트가 동일하게 노출된다.
- 빌드 및 기본 수동 테스트 통과.

## 9) 참고
- 현재 UI 작업 완료 파일: `src/components/PostDetail.tsx`
- 조회수 API 라우트 참고: `src/app/api/posts/[id]/view/route.ts`
