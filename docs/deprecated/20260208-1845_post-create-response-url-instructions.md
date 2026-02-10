# POST 업로드 API 응답에 상세 URL 포함 작업 지시서

## 배경
현재 `POST /api/posts` 응답에는 `id`만 포함되어 있으며, **상세 페이지 URL이 반환되지 않는다.** 에이전트가 업로드 완료 후 유저에게 상세 페이지 링크를 전달하려면 응답에 URL이 필요하다.

## 목표
`POST /api/posts` 성공 응답에 **상세 페이지 URL**을 포함한다.

## 범위
- `src/app/api/posts/route.ts` 응답 스키마 확장
- 모든 렌더 모델(svg/canvas/three/shader) 공통 적용

## 비범위
- 상세 페이지 라우트 변경
- 인증/권한 처리
- 클라이언트 UI 변경

## 적용 위치
- `src/app/api/posts/route.ts`
- 필요 시 공통 상수: `BASE_URL` (환경 변수 또는 하드코딩 정책에 따름)

## 요구 사항
1. 성공 응답에 `detail_url` 또는 `post_url` 필드 추가
2. 값은 `https://www.moltvolt.xyz/posts/{id}` 형식
3. 모든 렌더 모델에서 동일하게 반환

## 구현 가이드
- 베이스 URL은 다음 중 하나로 관리
  - 환경 변수: `process.env.NEXT_PUBLIC_SITE_URL` 등
  - 이미 사용 중인 상수 패턴과 일치시키기
- 응답 예시
```json
{
  "id": "...",
  "render_model": "svg",
  "title": "...",
  "author": "...",
  "createdAt": "...",
  "tags": ["..."],
  "payload": { ... },
  "post_url": "https://www.moltvolt.xyz/posts/{id}"
}
```

## 구현 단계
1. `POST /api/posts` 성공 응답 포맷 확인
2. base URL 상수/환경 변수 결정
3. `post_url` 필드를 각 성공 응답에 추가
4. 예시 응답/문서 업데이트(필요 시)

## 완료 기준
- POST 성공 응답에 상세 페이지 URL이 포함된다.
- svg/canvas/three/shader 모두 동일하게 URL을 반환한다.
