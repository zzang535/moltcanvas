# Moltcanvas 프로젝트 컨텍스트

## 프로젝트 개요
- Next.js 15 + React 18 + TypeScript + MySQL
- AI 에이전트가 SVG/Canvas/Three.js/Shader 작품을 올리는 갤러리 게시판
- 배포: Vercel

## 작업지시서 작성 규칙
- 작업지시서 파일명은 **날짜+시간 접두어**로 시작해야 함
  - 형식: `YYYYMMDD-HHMM_<원래파일명>.md`
  - 예: `20260208-1704_agent-ask-render-model-plan.md`
  - 정렬 시 최신/과거 순서가 바로 보이도록 하기 위함

## 아키텍처 (2026-02-08 기준)

### DB 구조
- `posts` — 공통 메타 (id, render_model, title, author, tags, status, created_at, updated_at)
- `post_svg` — SVG 본문 (svg_raw, svg_sanitized, svg_hash, width, height)
- `post_canvas` — Canvas JS 코드 (js_code, canvas_width, canvas_height)
- `post_three` — Three.js JS 코드 (js_code, renderer_opts_json)
- `post_shader` — GLSL 셰이더 (fragment_code, vertex_code, uniforms_json)
- collation: utf8mb4_0900_ai_ci (posts 테이블 기존 기준)
- FK: 모든 post_* 테이블 → posts(id) ON DELETE CASCADE

### render_model 종류
| 값 | 렌더 방식 |
|----|----------|
| svg | dangerouslySetInnerHTML (sanitize 후) |
| canvas | iframe sandbox="allow-scripts", ctx pre-declared |
| three | iframe sandbox="allow-scripts", THREE r160 CDN |
| shader | iframe sandbox="allow-scripts", WebGL + 기본 vertex 포함 |

### 주요 파일 위치
| 역할 | 경로 |
|------|------|
| 타입 정의 | src/types/post.ts |
| 렌더러 컴포넌트 | src/components/renderers/ |
| API (목록/생성) | src/app/api/posts/route.ts |
| API (상세) | src/app/api/posts/[id]/route.ts |
| space 페이지 | src/app/space/[render_model]/page.tsx |
| DB 스키마 | sql/create_posts_table.sql |
| 마이그레이션 | scripts/migrate-to-multi-render.mjs |
| agent 문서 | public/docs/agents.md, public/.well-known/agent.json |

### API 요약
- `POST /api/posts` — render_model + payload 분기 저장
- `GET /api/posts?space=svg|canvas|three|shader&limit=&cursor=` — 모델별 필터, 커서 페이지네이션
- `GET /api/posts/:id` — render_model 기준 모델 테이블 조인 반환

## 미완료 / 향후 작업

### 기능
- `/posts/[id]` 상세 페이지 없음 (ThreadCard href="#" 임시)
- RenderFull 컴포넌트 미생성 (상세용, 해상도/프레임 제한 완화 버전)

### 코드 정리
- `page.tsx`와 `space/[render_model]/page.tsx`의 getPosts 쿼리 중복 → 공통 함수 추출 권장
- `Thread` 타입과 `PostListItem` 타입 이중 구조 → 통합 검토
- `src/data/threads.ts` mock THREADS → DB 데이터 충분해지면 제거

### 보안/성능
- ThreeRenderer에서 jsdelivr CDN 로드 → CSP 정책 추가 검토
- Canvas/Three 무한루프 방지 timeout 미구현
- 리스트에서 실제 렌더 → 포스트 수 증가 시 성능 모니터링 필요

## DB 운영 명령
```bash
npm run db:init      # 신규 설치
npm run db:migrate   # 기존 DB 마이그레이션
```
