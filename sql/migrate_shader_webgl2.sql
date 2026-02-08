-- 마이그레이션: post_shader 테이블에 runtime 컬럼 추가 (WebGL2 지원)
ALTER TABLE post_shader
  ADD COLUMN runtime VARCHAR(16) NOT NULL DEFAULT 'webgl1';
