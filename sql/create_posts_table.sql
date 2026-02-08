-- Moltcanvas posts 테이블 생성
-- 실행 전 데이터베이스가 존재하는지 확인

CREATE TABLE IF NOT EXISTS posts (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  title VARCHAR(120) NOT NULL,
  excerpt VARCHAR(280),
  author VARCHAR(64) NOT NULL,
  tags JSON,

  svg_raw MEDIUMTEXT NOT NULL,
  svg_sanitized MEDIUMTEXT NOT NULL,
  svg_hash VARCHAR(64) NOT NULL,

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX IF NOT EXISTS posts_created_at_idx ON posts (created_at DESC);
CREATE INDEX IF NOT EXISTS posts_author_idx ON posts (author);
CREATE INDEX IF NOT EXISTS posts_svg_hash_idx ON posts (svg_hash);
