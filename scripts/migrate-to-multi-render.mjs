/**
 * 마이그레이션 스크립트: SVG 전용 posts -> multi render model 구조
 * - 주의: 실행 전 DB 백업 필수
 * - 기존 SVG 데이터를 posts + post_svg 구조로 이전
 */

import { createConnection } from 'mysql2/promise';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env.local') });

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

    // Step 1: posts 테이블에 신규 컬럼 추가
    console.log('⏳ Step 1: Adding render_model and status columns to posts...');
    try {
      await conn.execute(`ALTER TABLE posts ADD COLUMN render_model ENUM('svg','canvas','three','shader') NOT NULL DEFAULT 'svg' AFTER id`);
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('  ⚠️  render_model column already exists, skipping');
      } else throw e;
    }
    try {
      await conn.execute(`ALTER TABLE posts ADD COLUMN status ENUM('published','quarantined','deleted') NOT NULL DEFAULT 'published' AFTER tags`);
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('  ⚠️  status column already exists, skipping');
      } else throw e;
    }
    console.log('✅ Step 1 done');

    // Step 2: 인덱스 추가
    console.log('⏳ Step 2: Adding indexes...');
    const newIndexes = [
      'CREATE INDEX idx_render_model_created_at ON posts (render_model, created_at)',
      'CREATE INDEX idx_status_created_at ON posts (status, created_at)',
    ];
    for (const idx of newIndexes) {
      try {
        await conn.execute(idx);
      } catch (e) {
        if (e.code === 'ER_DUP_KEYNAME') {
          console.log(`  ⚠️  Index already exists, skipping`);
        } else throw e;
      }
    }
    console.log('✅ Step 2 done');

    // Step 3: post_svg 테이블 생성
    console.log('⏳ Step 3: Creating post_svg table...');
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS post_svg (
        post_id CHAR(36) PRIMARY KEY,
        svg_raw LONGTEXT NOT NULL,
        svg_sanitized LONGTEXT NOT NULL,
        svg_hash VARCHAR(64) NOT NULL,
        width INT NULL,
        height INT NULL,
        params_json JSON NULL,
        CONSTRAINT fk_post_svg FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci
    `);
    console.log('✅ Step 3 done');

    // Step 4: 기존 SVG 데이터를 post_svg로 이전
    console.log('⏳ Step 4: Migrating SVG data to post_svg...');
    // svg_raw, svg_sanitized, svg_hash 컬럼이 있는 경우에만 실행
    try {
      const [result] = await conn.execute(`
        INSERT IGNORE INTO post_svg (post_id, svg_raw, svg_sanitized, svg_hash)
        SELECT id, svg_raw, svg_sanitized, svg_hash FROM posts
        WHERE svg_raw IS NOT NULL AND svg_raw != ''
      `);
      console.log(`  ✅ Migrated rows: ${result.affectedRows}`);
    } catch (e) {
      if (e.code === 'ER_BAD_FIELD_ERROR') {
        console.log('  ⚠️  Old SVG columns not found (already migrated or fresh install), skipping');
      } else throw e;
    }
    console.log('✅ Step 4 done');

    // Step 5: post_canvas, post_three, post_shader 테이블 생성
    console.log('⏳ Step 5: Creating remaining model tables...');
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS post_canvas (
        post_id CHAR(36) PRIMARY KEY,
        js_code LONGTEXT NOT NULL,
        canvas_width INT NULL,
        canvas_height INT NULL,
        params_json JSON NULL,
        code_hash VARCHAR(64) NULL,
        CONSTRAINT fk_post_canvas FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci
    `);
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS post_three (
        post_id CHAR(36) PRIMARY KEY,
        js_code LONGTEXT NOT NULL,
        renderer_opts_json JSON NULL,
        params_json JSON NULL,
        assets_json JSON NULL,
        code_hash VARCHAR(64) NULL,
        CONSTRAINT fk_post_three FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci
    `);
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS post_shader (
        post_id CHAR(36) PRIMARY KEY,
        fragment_code LONGTEXT NOT NULL,
        vertex_code LONGTEXT NULL,
        uniforms_json JSON NULL,
        shader_hash VARCHAR(64) NULL,
        CONSTRAINT fk_post_shader FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci
    `);
    console.log('✅ Step 5 done');

    console.log('🎉 Migration complete!');
    console.log('');
    console.log('NOTE: Old svg_raw, svg_sanitized, svg_hash columns in posts table are still present.');
    console.log('After verifying the migration, you can remove them with:');
    console.log('  ALTER TABLE posts DROP COLUMN svg_raw, DROP COLUMN svg_sanitized, DROP COLUMN svg_hash;');
  } catch (err) {
    const msg = err?.code ? `[${err.code}]` : '';
    console.error(`❌ Migration failed. ${msg}`, err?.message || '');
    process.exitCode = 1;
  } finally {
    if (conn) await conn.end();
  }
}

main();
