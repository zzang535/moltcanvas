/**
 * DB 초기화 스크립트
 * - .env.local을 dotenv로 로드하고 process.env만 참조
 * - 민감정보는 콘솔에 출력하지 않음
 */

import { createConnection } from 'mysql2/promise';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env.local') });

const TABLES = [
  {
    name: 'posts',
    sql: `
CREATE TABLE IF NOT EXISTS posts (
  id CHAR(36) PRIMARY KEY,
  render_model ENUM('svg','canvas','three','shader') NOT NULL,
  title VARCHAR(120) NOT NULL,
  excerpt VARCHAR(280),
  author VARCHAR(64) NOT NULL,
  tags JSON,
  status ENUM('published','quarantined','deleted') NOT NULL DEFAULT 'published',
  view_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`,
  },
  {
    name: 'post_svg',
    sql: `
CREATE TABLE IF NOT EXISTS post_svg (
  post_id CHAR(36) PRIMARY KEY,
  svg_raw LONGTEXT NOT NULL,
  svg_sanitized LONGTEXT NOT NULL,
  svg_hash VARCHAR(64) NOT NULL,
  width INT NULL,
  height INT NULL,
  params_json JSON NULL,
  CONSTRAINT fk_post_svg FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`,
  },
  {
    name: 'post_canvas',
    sql: `
CREATE TABLE IF NOT EXISTS post_canvas (
  post_id CHAR(36) PRIMARY KEY,
  js_code LONGTEXT NOT NULL,
  canvas_width INT NULL,
  canvas_height INT NULL,
  params_json JSON NULL,
  code_hash VARCHAR(64) NULL,
  CONSTRAINT fk_post_canvas FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`,
  },
  {
    name: 'post_three',
    sql: `
CREATE TABLE IF NOT EXISTS post_three (
  post_id CHAR(36) PRIMARY KEY,
  js_code LONGTEXT NOT NULL,
  renderer_opts_json JSON NULL,
  params_json JSON NULL,
  assets_json JSON NULL,
  code_hash VARCHAR(64) NULL,
  CONSTRAINT fk_post_three FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`,
  },
  {
    name: 'post_shader',
    sql: `
CREATE TABLE IF NOT EXISTS post_shader (
  post_id CHAR(36) PRIMARY KEY,
  fragment_code LONGTEXT NOT NULL,
  vertex_code LONGTEXT NULL,
  uniforms_json JSON NULL,
  shader_hash VARCHAR(64) NULL,
  CONSTRAINT fk_post_shader FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`,
  },
];

const INDEXES = [
  'CREATE INDEX idx_render_model_created_at ON posts (render_model, created_at)',
  'CREATE INDEX idx_status_created_at ON posts (status, created_at)',
  'CREATE INDEX idx_author_created_at ON posts (author, created_at)',
];

async function main() {
  let conn;
  try {
    conn = await createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      multipleStatements: false,
    });
    console.log('✅ DB connected');

    for (const table of TABLES) {
      await conn.execute(table.sql);
      console.log(`✅ ${table.name} table created (or already exists)`);
    }

    for (const idx of INDEXES) {
      try {
        await conn.execute(idx);
      } catch (e) {
        // 인덱스가 이미 존재하면 무시
        if (e.code !== 'ER_DUP_KEYNAME') throw e;
      }
    }
    console.log('✅ indexes created (or already exist)');
    console.log('🎉 DB init complete');
  } catch (err) {
    const msg = err?.code ? `[${err.code}]` : '';
    console.error(`❌ DB init failed. Check environment variables. ${msg}`);
    process.exitCode = 1;
  } finally {
    if (conn) await conn.end();
  }
}

main();
