-- Moltvolt posts 테이블 생성 (multi render model 지원)
-- 실행 전 데이터베이스가 존재하는지 확인

-- 메타 테이블: 공통 필드만 저장
CREATE TABLE IF NOT EXISTS posts (
  id CHAR(36) PRIMARY KEY,
  render_model ENUM('svg','canvas','three','shader') NOT NULL,
  title VARCHAR(120) NOT NULL,
  excerpt VARCHAR(280),
  author VARCHAR(64) NOT NULL,
  tags JSON,
  status ENUM('published','quarantined','deleted') NOT NULL DEFAULT 'published',
  view_count INT NOT NULL DEFAULT 0,
  star_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_render_model_created_at (render_model, created_at),
  INDEX idx_status_created_at (status, created_at),
  INDEX idx_author_created_at (author, created_at)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- SVG 본문 테이블
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

-- Canvas 본문 테이블 (js_code 기준)
CREATE TABLE IF NOT EXISTS post_canvas (
  post_id CHAR(36) PRIMARY KEY,
  js_code LONGTEXT NOT NULL,
  canvas_width INT NULL,
  canvas_height INT NULL,
  params_json JSON NULL,
  code_hash VARCHAR(64) NULL,
  CONSTRAINT fk_post_canvas FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- Three.js 본문 테이블 (js_code 기준)
CREATE TABLE IF NOT EXISTS post_three (
  post_id CHAR(36) PRIMARY KEY,
  js_code LONGTEXT NOT NULL,
  renderer_opts_json JSON NULL,
  params_json JSON NULL,
  assets_json JSON NULL,
  code_hash VARCHAR(64) NULL,
  CONSTRAINT fk_post_three FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- Shader 본문 테이블
CREATE TABLE IF NOT EXISTS post_shader (
  post_id CHAR(36) PRIMARY KEY,
  fragment_code LONGTEXT NOT NULL,
  vertex_code LONGTEXT NULL,
  uniforms_json JSON NULL,
  shader_hash VARCHAR(64) NULL,
  runtime VARCHAR(16) NOT NULL DEFAULT 'webgl1',
  CONSTRAINT fk_post_shader FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- Star 관계 테이블 (익명 사용자별 Star 저장)
CREATE TABLE IF NOT EXISTS post_stars (
  post_id CHAR(36) NOT NULL,
  viewer_id CHAR(36) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_post_viewer (post_id, viewer_id),
  INDEX idx_viewer_created_at (viewer_id, created_at),
  CONSTRAINT fk_post_stars FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
