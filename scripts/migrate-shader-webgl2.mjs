/**
 * 마이그레이션: post_shader 테이블에 runtime 컬럼 추가 (WebGL2 지원)
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

    console.log('⏳ Adding runtime column to post_shader...');
    try {
      await conn.execute(
        `ALTER TABLE post_shader ADD COLUMN runtime VARCHAR(16) NOT NULL DEFAULT 'webgl1'`
      );
      console.log('✅ runtime column added');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('  ⚠️  runtime column already exists, skipping');
      } else throw e;
    }

    console.log('⏳ Verifying column...');
    const [rows] = await conn.execute(`SHOW COLUMNS FROM post_shader LIKE 'runtime'`);
    if (rows.length > 0) {
      console.log(`✅ Verified: runtime column exists (default: ${rows[0].Default})`);
    } else {
      throw new Error('runtime column not found after migration');
    }

    console.log('🎉 Migration complete!');
  } catch (err) {
    const msg = err?.code ? `[${err.code}]` : '';
    console.error(`❌ Migration failed. ${msg}`, err?.message || '');
    process.exitCode = 1;
  } finally {
    if (conn) await conn.end();
  }
}

main();
