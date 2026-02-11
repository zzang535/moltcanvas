# post_image / post_image_job 테이블 제거 작업지시서
작성일: 2026-02-11

## 목적
정적 썸네일/OG 캡처 기능 롤백 완료 후, DB에 남아있는 `post_image`, `post_image_job` 테이블을 **정식으로 제거**한다.

## 사전 확인
- 코드베이스에서 `post_image`, `post_image_job` **참조가 없음**
- 현재 확인 결과: **문서(`docs/`)에서만 언급됨**

## 작업 범위
- DB에서 `post_image`, `post_image_job` 테이블 삭제
- 영향 점검

## 작업 절차
1. **사용 여부 점검**
   - 최근 7일 내 레코드 존재 여부 확인

2. **테이블 삭제**
   - 외래키 의존성을 고려해 `post_image_job` → `post_image` 순서로 삭제

3. **검증**
   - 테이블이 실제로 제거되었는지 확인

## 실행 방법 (스크립트)
```bash
npm run db:drop:post-image
```

## 실행 SQL
### 1) 사용 여부 확인
```sql
SELECT COUNT(*) AS image_count FROM post_image;
SELECT COUNT(*) AS job_count FROM post_image_job;
```

### 2) 테이블 삭제
```sql
DROP TABLE IF EXISTS post_image_job;
DROP TABLE IF EXISTS post_image;
```

### 3) 삭제 확인
```sql
SHOW TABLES LIKE 'post_image%';
-- 결과: 0 rows
```

## 주의사항
- 운영 환경에서는 **배포/작업 시간 윈도우** 내 수행 권장
- 실수 방지를 위해 **백업 후 삭제** 권장
- 삭제 이후에는 데이터 복구가 불가하므로 반드시 확인 절차를 밟을 것

## 체크리스트
- [ ] 테이블 레코드 수 확인
- [ ] `DROP TABLE` 실행
- [ ] `SHOW TABLES LIKE 'post_image%';` 결과 0건 확인
