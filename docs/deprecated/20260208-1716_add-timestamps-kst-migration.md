# 모든 테이블 created_at/updated_at + KST 기록 마이그레이션 작업지시서
작성일: 2026-02-08 17:16

## 1) 목적
- 모든 테이블에 `created_at`, `updated_at`을 추가한다.
- 저장 시각을 **한국 시간(KST, +09:00)** 기준으로 기록하도록 설정한다.

## 2) 대상 테이블
- `posts`
- `post_svg`
- `post_canvas`
- `post_three`
- `post_shader`

## 3) 핵심 결정
- 컬럼 타입: `TIMESTAMP` 사용
- DB 세션 타임존을 `+09:00`으로 고정하여 KST로 기록/조회

> 참고: `TIMESTAMP`는 세션 타임존을 기준으로 입출력이 변환됨. 따라서 **DB/세션 time_zone을 KST로 고정**해야 KST로 저장/조회됨.

## 4) 마이그레이션 절차

### 4.1 DB 타임존 설정 (필수)
**옵션 A: MySQL 글로벌 설정**
```sql
SET GLOBAL time_zone = '+09:00';
```

**옵션 B: DB 서버 설정 파일에 반영**
```
[mysqld]
# Asia/Seoul
default-time-zone = '+09:00'
```

**옵션 C: 애플리케이션 연결 시 세션 타임존 강제**
```sql
SET time_zone = '+09:00';
```

> 최소 하나는 반드시 적용해야 KST 기록이 보장됨.

---

### 4.2 컬럼 추가 (posts 제외 시 생략)
이미 컬럼이 있는 경우 에러 방지를 위해 `IF NOT EXISTS` 사용을 권장.

```sql
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

ALTER TABLE post_svg
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

ALTER TABLE post_canvas
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

ALTER TABLE post_three
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

ALTER TABLE post_shader
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
```

---

### 4.3 기존 데이터 백필 (선택)
`post_*` 테이블의 타임스탬프를 `posts.created_at/updated_at`로 맞추려면:

```sql
UPDATE post_svg ps
JOIN posts p ON p.id = ps.post_id
SET ps.created_at = p.created_at, ps.updated_at = p.updated_at
WHERE ps.created_at IS NULL OR ps.updated_at IS NULL;

UPDATE post_canvas pc
JOIN posts p ON p.id = pc.post_id
SET pc.created_at = p.created_at, pc.updated_at = p.updated_at
WHERE pc.created_at IS NULL OR pc.updated_at IS NULL;

UPDATE post_three pt
JOIN posts p ON p.id = pt.post_id
SET pt.created_at = p.created_at, pt.updated_at = p.updated_at
WHERE pt.created_at IS NULL OR pt.updated_at IS NULL;

UPDATE post_shader ps
JOIN posts p ON p.id = ps.post_id
SET ps.created_at = p.created_at, ps.updated_at = p.updated_at
WHERE ps.created_at IS NULL OR ps.updated_at IS NULL;
```

---

## 5) 검증 체크리스트
- `SHOW VARIABLES LIKE 'time_zone';` 결과가 `+09:00`인지 확인
- 각 테이블에 `created_at`, `updated_at` 컬럼 존재 확인
- 신규 삽입 시 시간이 KST 기준으로 기록되는지 확인

## 6) 완료 기준
- 모든 테이블에 `created_at`, `updated_at` 컬럼 존재
- 신규 레코드 저장 시 KST로 기록됨
