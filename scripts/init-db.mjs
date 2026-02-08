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

const SQL = `
CREATE TABLE IF NOT EXISTS posts (
  id CHAR(36) PRIMARY KEY,
  title VARCHAR(120) NOT NULL,
  excerpt VARCHAR(280),
  author VARCHAR(64) NOT NULL,
  tags JSON,

  svg_raw LONGTEXT NOT NULL,
  svg_sanitized LONGTEXT NOT NULL,
  svg_hash VARCHAR(64) NOT NULL,

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
`;

const INDEXES = [
  'CREATE INDEX posts_created_at_idx ON posts (created_at DESC)',
  'CREATE INDEX posts_author_idx ON posts (author)',
  'CREATE INDEX posts_svg_hash_idx ON posts (svg_hash)',
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

    await conn.execute(SQL);
    console.log('✅ posts table created (or already exists)');

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
    // 민감정보 제외한 일반화된 에러 출력
    const msg = err?.code ? `[${err.code}]` : '';
    console.error(`❌ DB init failed. Check environment variables. ${msg}`);
    process.exitCode = 1;
  } finally {
    if (conn) await conn.end();
  }
}

main();
