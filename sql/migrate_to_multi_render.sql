-- 마이그레이션: SVG 전용 posts 테이블을 multi render model 구조로 전환
-- 주의: 실행 전 백업 필수

-- Step 1: posts 테이블에 신규 컬럼 추가
ALTER TABLE posts
  ADD COLUMN render_model ENUM('svg','canvas','three','shader') NOT NULL DEFAULT 'svg' AFTER id,
  ADD COLUMN status ENUM('published','quarantined','deleted') NOT NULL DEFAULT 'published' AFTER tags,
  ADD INDEX idx_render_model_created_at (render_model, created_at),
  ADD INDEX idx_status_created_at (status, created_at);

-- Step 2: post_svg 테이블 생성
CREATE TABLE IF NOT EXISTS post_svg (
  post_id CHAR(36) PRIMARY KEY,
  svg_raw LONGTEXT NOT NULL,
  svg_sanitized LONGTEXT NOT NULL,
  svg_hash VARCHAR(64) NOT NULL,
  width INT NULL,
  height INT NULL,
  params_json JSON NULL,
  CONSTRAINT fk_post_svg FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- Step 3: post_canvas 테이블 생성
CREATE TABLE IF NOT EXISTS post_canvas (
  post_id CHAR(36) PRIMARY KEY,
  js_code LONGTEXT NOT NULL,
  canvas_width INT NULL,
  canvas_height INT NULL,
  params_json JSON NULL,
  code_hash VARCHAR(64) NULL,
  CONSTRAINT fk_post_canvas FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- Step 4: post_three 테이블 생성
CREATE TABLE IF NOT EXISTS post_three (
  post_id CHAR(36) PRIMARY KEY,
  js_code LONGTEXT NOT NULL,
  renderer_opts_json JSON NULL,
  params_json JSON NULL,
  assets_json JSON NULL,
  code_hash VARCHAR(64) NULL,
  CONSTRAINT fk_post_three FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- Step 5: post_shader 테이블 생성
CREATE TABLE IF NOT EXISTS post_shader (
  post_id CHAR(36) PRIMARY KEY,
  fragment_code LONGTEXT NOT NULL,
  vertex_code LONGTEXT NULL,
  uniforms_json JSON NULL,
  shader_hash VARCHAR(64) NULL,
  CONSTRAINT fk_post_shader FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- Step 6: 기존 SVG 데이터를 post_svg로 이동
INSERT INTO post_svg (post_id, svg_raw, svg_sanitized, svg_hash)
SELECT id, svg_raw, svg_sanitized, svg_hash FROM posts;

-- Step 7: posts 테이블에서 SVG 전용 컬럼 제거 (확인 후 실행)
-- ALTER TABLE posts DROP COLUMN svg_raw, DROP COLUMN svg_sanitized, DROP COLUMN svg_hash;
-- (위 컬럼 제거는 데이터 이동 검증 후 별도로 실행할 것)
