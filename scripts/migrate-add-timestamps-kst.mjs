/**
 * 마이그레이션: 모든 post_* 테이블에 created_at/updated_at 추가 + KST 타임존 세션 설정
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

    // KST 세션 타임존 설정
    await conn.execute(`SET time_zone = '+09:00'`);
    const [[tzRow]] = await conn.execute(`SELECT @@session.time_zone AS tz`);
    console.log(`✅ Session time_zone set to ${tzRow.tz}`);

    // post_* 테이블에 타임스탬프 컬럼 추가
    const allTables = ['posts', 'post_svg', 'post_canvas', 'post_three', 'post_shader'];
    for (const table of allTables) {
      console.log(`⏳ Adding timestamps to ${table}...`);
      for (const [name, def] of [
        ['created_at', 'TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP'],
        ['updated_at', 'TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'],
      ]) {
        try {
          await conn.execute(`ALTER TABLE ${table} ADD COLUMN ${name} ${def}`);
        } catch (e) {
          if (e.code === 'ER_DUP_FIELDNAME') {
            console.log(`  ⚠️  ${name} already exists in ${table}, skipping`);
          } else throw e;
        }
      }
      console.log(`✅ ${table} done`);
    }

    // 백필: post_* 타임스탬프를 posts.created_at/updated_at 값으로 맞춤
    console.log('⏳ Backfilling timestamps from posts...');
    for (const [table, alias] of [['post_svg', 'ps'], ['post_canvas', 'pc'], ['post_three', 'pt'], ['post_shader', 'psh']]) {
      const [result] = await conn.execute(
        `UPDATE ${table} ${alias}
         JOIN posts p ON p.id = ${alias}.post_id
         SET ${alias}.created_at = p.created_at, ${alias}.updated_at = p.updated_at
         WHERE ${alias}.created_at = ${alias}.updated_at`
      );
      console.log(`  ${table}: ${result.affectedRows} rows backfilled`);
    }
    console.log('✅ Backfill done');

    // 최종 검증
    console.log('\n📋 Verification:');
    const [[tzFinal]] = await conn.execute(`SELECT @@session.time_zone AS tz`);
    console.log(`  session time_zone: ${tzFinal.tz}`);
    for (const t of ['posts', 'post_svg', 'post_canvas', 'post_three', 'post_shader']) {
      const [cols] = await conn.execute(`SHOW COLUMNS FROM ${t} WHERE Field IN ('created_at','updated_at')`);
      console.log(`  ${t}: ${cols.map(c => c.Field).join(', ')}`);
    }

    console.log('\n🎉 Migration complete!');
    console.log('NOTE: Add timezone=+09:00 to DB connection config to ensure KST on all queries.');
  } catch (err) {
    const msg = err?.code ? `[${err.code}]` : '';
    console.error(`❌ Migration failed. ${msg}`, err?.message || '');
    process.exitCode = 1;
  } finally {
    if (conn) await conn.end();
  }
}

main();
