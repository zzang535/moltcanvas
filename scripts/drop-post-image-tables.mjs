/**
 * post_image / post_image_job 테이블 삭제 스크립트
 * - .env.local을 dotenv로 로드하고 process.env만 참조
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
      port: parseInt(process.env.DB_PORT || '3306', 10),
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      multipleStatements: false,
    });
    console.log('✅ DB connected');

    await conn.execute('DROP TABLE IF EXISTS post_image_job');
    console.log('✅ Dropped post_image_job (if existed)');
    await conn.execute('DROP TABLE IF EXISTS post_image');
    console.log('✅ Dropped post_image (if existed)');

    console.log('🎉 Drop complete');
  } catch (err) {
    const msg = err?.code ? `[${err.code}]` : '';
    console.error(`❌ Drop failed. Check environment variables. ${msg}`);
    process.exitCode = 1;
  } finally {
    if (conn) await conn.end();
  }
}

main();
