/**
 * 마이그레이션: posts 테이블에 view_count 컬럼 추가
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

    try {
      await conn.execute(
        `ALTER TABLE posts ADD COLUMN view_count INT NOT NULL DEFAULT 0 AFTER status`
      );
      console.log('✅ view_count column added');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('⚠️  view_count already exists, skipping');
      } else {
        throw e;
      }
    }

    await conn.execute(`UPDATE posts SET view_count = 0 WHERE view_count IS NULL`);
    console.log('✅ view_count backfilled');
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
