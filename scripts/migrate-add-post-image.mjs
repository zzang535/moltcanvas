/**
 * 마이그레이션 스크립트: post_image 테이블 추가
 * - 주의: 실행 전 DB 백업 권장
 * - 썸네일 및 OG 이미지 저장용 테이블 생성
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

    // post_image 테이블 생성
    console.log('⏳ Creating post_image table...');
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS post_image (
        post_id CHAR(36) NOT NULL,
        kind ENUM('thumb','og') NOT NULL,
        mime VARCHAR(32) NOT NULL,
        width INT NOT NULL,
        height INT NOT NULL,
        bytes INT NOT NULL,
        data MEDIUMBLOB NOT NULL,
        sha256 CHAR(64) NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (post_id, kind),
        CONSTRAINT fk_post_image FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci
    `);
    console.log('✅ post_image table created (or already exists)');

    console.log('🎉 Migration complete!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Implement capture utility (src/lib/capture-post-image.ts)');
    console.log('2. Create render page for capture (/render/[id])');
    console.log('3. Run capture script to generate images for existing posts');
  } catch (err) {
    const msg = err?.code ? `[${err.code}]` : '';
    console.error(`❌ Migration failed. ${msg}`, err?.message || '');
    process.exitCode = 1;
  } finally {
    if (conn) await conn.end();
  }
}

main();
