/**
 * 마이그레이션 스크립트: post_image_job 테이블 추가
 * - 주의: 실행 전 DB 백업 권장
 * - 이미지 캡처 작업 큐 테이블 생성
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

    // post_image_job 테이블 생성
    console.log('⏳ Creating post_image_job table...');
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS post_image_job (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        post_id CHAR(36) NOT NULL,
        kind ENUM('thumb','og') NOT NULL,
        status ENUM('pending','running','success','failed') NOT NULL DEFAULT 'pending',
        attempts INT NOT NULL DEFAULT 0,
        last_error VARCHAR(512) NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_post_kind (post_id, kind),
        CONSTRAINT fk_post_image_job FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci
    `);
    console.log('✅ post_image_job table created (or already exists)');

    // 인덱스 추가 (성능 최적화)
    console.log('⏳ Creating indexes...');
    const indexes = [
      'CREATE INDEX idx_status_created_at ON post_image_job (status, created_at)',
      'CREATE INDEX idx_post_id ON post_image_job (post_id)',
    ];

    for (const idx of indexes) {
      try {
        await conn.execute(idx);
      } catch (e) {
        if (e.code === 'ER_DUP_KEYNAME') {
          console.log('  ⚠️  Index already exists, skipping');
        } else throw e;
      }
    }
    console.log('✅ Indexes created');

    console.log('🎉 Migration complete!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Update POST /api/posts to enqueue capture jobs');
    console.log('2. Run capture-image-queue.mjs worker');
  } catch (err) {
    const msg = err?.code ? `[${err.code}]` : '';
    console.error(`❌ Migration failed. ${msg}`, err?.message || '');
    process.exitCode = 1;
  } finally {
    if (conn) await conn.end();
  }
}

main();
