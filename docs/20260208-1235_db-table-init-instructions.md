# DB 테이블 생성 작업지시서 (MySQL, Cloud)

작성일: 2026-02-08

이 문서는 에이전트가 **DB 계정정보를 직접 열람하지 않고** `process.env`만 참조하여 테이블을 생성하도록 안내한다.
모든 비밀값은 `.env.local`에 저장되어 있으며, 이 파일의 내용을 **열어보거나 출력하면 안 된다.**

## 1) 목표
- `.env.local`의 DB 정보로 MySQL에 연결한다.
- MVP 스키마 기준으로 `posts` 테이블을 생성한다.
- 작업 로그에 계정/비밀번호가 노출되지 않도록 한다.

## 2) 필수 환경 변수 (예시 이름)
`.env.local`에 아래 키가 존재한다고 가정한다. (값은 열람 금지)
- `DB_HOST`
- `DB_PORT` (기본 3306)
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `DB_SSL` (optional, `true`/`false`)

> **주의**: 에이전트는 `.env.local`을 열거나 출력하지 않는다.

## 3) 작업 방식 (권장)
- Node 스크립트에서 `dotenv`로 `.env.local`을 로드한 뒤, `process.env`로만 접근
- `mysql2`(promise)로 연결
- SQL은 `CREATE TABLE IF NOT EXISTS`로 idempotent 구성

## 4) 구현 지시

### 4.1 의존성 추가
- `mysql2`
- `dotenv`

### 4.2 스크립트 파일 생성
- 경로 예시: `scripts/init-db.mjs`
- 요구사항
  - `dotenv`로 `.env.local` 로드
  - `process.env`로만 접속 정보 읽기
  - 연결 성공/실패 로그는 **민감정보 제외**
  - 테이블 생성 SQL 실행
  - 완료 후 연결 종료

### 4.3 테이블 생성 SQL (MVP)
```sql
CREATE TABLE IF NOT EXISTS posts (
  id CHAR(36) PRIMARY KEY,
  title VARCHAR(120) NOT NULL,
  excerpt VARCHAR(280),
  author VARCHAR(64) NOT NULL,
  tags JSON,

  svg_raw LONGTEXT NOT NULL,
  svg_sanitized LONGTEXT NOT NULL,
  svg_hash VARCHAR(64) NOT NULL,

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE INDEX posts_created_at_idx ON posts (created_at);
CREATE INDEX posts_author_idx ON posts (author);
CREATE INDEX posts_svg_hash_idx ON posts (svg_hash);
```

> `id`는 UUID 문자열을 저장한다.

### 4.4 npm script 추가
- `package.json`에 다음 추가
  - `"db:init": "node scripts/init-db.mjs"`

### 4.5 실행
- `npm run db:init`

## 5) 보안 준수 사항
- `.env.local` 내용을 열람/출력/로그 기록 금지
- `process.env`에서 읽은 값도 콘솔에 출력 금지
- 연결 실패 시 에러 메시지는 일반화해서 출력
  - 예: "DB connection failed. Check environment variables."

## 6) 완료 기준
- `posts` 테이블이 생성됨
- 재실행 시 에러 없이 완료됨 (idempotent)
- 로그에 비밀값 노출 없음

## 7) 참고
- DB가 사설 네트워크(Private) 또는 IP allowlist로 제한되어 있어야 함
- 운영 환경에서는 Secret Manager를 통해 `DB_*`를 주입하는 것을 권장
