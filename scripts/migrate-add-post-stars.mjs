/**
 * 마이그레이션: Star 기능 추가
 * - posts 테이블에 star_count 컬럼 추가
 * - post_stars 관계 테이블 생성
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
    });
    console.log('✅ DB connected');

    // Step 1: Add star_count column to posts table
    try {
      await conn.execute(
        `ALTER TABLE posts ADD COLUMN star_count INT NOT NULL DEFAULT 0 AFTER view_count`
      );
      console.log('✅ star_count column added to posts table');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('⚠️  star_count column already exists, skipping');
      } else {
        throw e;
      }
    }

    // Step 2: Backfill star_count for existing posts
    await conn.execute(`UPDATE posts SET star_count = 0 WHERE star_count IS NULL`);
    console.log('✅ star_count backfilled');

    // Step 3: Create post_stars table
    try {
      await conn.execute(`
        CREATE TABLE IF NOT EXISTS post_stars (
          post_id CHAR(36) NOT NULL,
          viewer_id CHAR(36) NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY uniq_post_viewer (post_id, viewer_id),
          INDEX idx_viewer_created_at (viewer_id, created_at),
          CONSTRAINT fk_post_stars FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci
      `);
      console.log('✅ post_stars table created');
    } catch (e) {
      if (e.code === 'ER_TABLE_EXISTS_ERROR') {
        console.log('⚠️  post_stars table already exists, skipping');
      } else {
        throw e;
      }
    }

    console.log('🎉 Migration complete');
  } catch (err) {
    const msg = err?.code ? `[${err.code}]` : '';
    console.error(`❌ Migration failed. ${msg}`, err?.message || '');
    process.exitCode = 1;
  } finally {
    if (conn) await conn.end();
  }
}

main();
