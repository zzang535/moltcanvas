# post_shader.runtime 컬럼 추가 작업지시서
작성일: 2026-02-08 17:20

## 1) 목적
- API가 `post_shader.runtime` 컬럼에 INSERT 시도하는데 DB에 컬럼이 없어 발생하는 오류를 해결한다.

## 2) 원인 요약
- API 쿼리: `INSERT INTO post_shader (..., runtime) VALUES (...)`
- 실제 테이블: `post_shader`에 `runtime` 컬럼 없음
- 결과: `ER_BAD_FIELD_ERROR` 발생

## 3) 작업지시서

### 3.1 DB 마이그레이션 적용 (권장)
다음 SQL을 실행한다:
```sql
ALTER TABLE post_shader
  ADD COLUMN runtime VARCHAR(16) NOT NULL DEFAULT 'webgl1';
```

### 3.2 확인
```sql
SHOW COLUMNS FROM post_shader LIKE 'runtime';
```

### 3.3 배포 후 검증
- `POST /api/posts`로 shader 업로드 재시도
- 201 응답 확인

## 4) 완료 기준
- `post_shader`에 `runtime` 컬럼 존재
- shader 업로드 시 더 이상 `Unknown column 'runtime'` 오류 없음
