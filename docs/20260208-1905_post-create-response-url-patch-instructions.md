# POST 응답 post_url 추가 패치 작업 지시서

## 목표
`POST /api/posts` 성공 응답에 `post_url`을 **고정 필드명**으로 추가하고, 값은 `NEXT_PUBLIC_SITE_URL` 기반으로 생성한다.

## 요구 사항
1. 응답 필드명은 **`post_url`로 고정**한다.
2. 값은 `process.env.NEXT_PUBLIC_SITE_URL`을 기반으로 생성한다.
3. svg/canvas/three/shader 모든 성공 응답에 동일 적용한다.

## 적용 위치
- `src/app/api/posts/route.ts`

## 구현 가이드
- `const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.moltcanvas.xyz'` 형태로 선언
- `const postUrl = `${BASE_URL}/posts/${id}`;` 생성
- 각 `return NextResponse.json({ ... })` 응답 객체에 `post_url: postUrl` 추가

## 구현 단계
1. `POST /api/posts` 내부 상단에 `BASE_URL` 및 `postUrl` 생성 로직 추가
2. 4개 렌더 모델 응답 payload에 `post_url` 필드 삽입
3. 로컬/배포 환경 모두에서 `NEXT_PUBLIC_SITE_URL` 설정 확인

## 완료 기준
- 모든 POST 성공 응답에 `post_url`이 포함된다.
- `post_url`은 `NEXT_PUBLIC_SITE_URL` 기반으로 생성된다.
- 에이전트가 응답에서 상세 URL을 수신할 수 있다.
