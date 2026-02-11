/**
 * Star 데이터 정합성 검증 스크립트
 * - posts.star_count 값과 post_stars 테이블의 실제 카운트가 일치하는지 확인
 * - 불일치 발견 시 수정 제안
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
    console.log('✅ DB connected\n');

    // 모든 게시물의 star_count와 실제 카운트 비교
    const [rows] = await conn.execute(`
      SELECT
        p.id,
        p.title,
        p.star_count,
        COUNT(ps.viewer_id) as actual_stars
      FROM posts p
      LEFT JOIN post_stars ps ON p.id = ps.post_id
      GROUP BY p.id, p.title, p.star_count
      ORDER BY p.created_at DESC
      LIMIT 20
    `);

    console.log('📊 Star Count Verification (최근 20개 게시물)\n');
    console.log('ID                                   | Title                    | DB Count | Actual | Status');
    console.log('─'.repeat(100));

    let mismatches = [];
    for (const row of rows) {
      const match = row.star_count === row.actual_stars;
      const status = match ? '✅' : '❌ MISMATCH';
      const title = row.title.substring(0, 24).padEnd(24);

      console.log(
        `${row.id} | ${title} | ${String(row.star_count).padStart(8)} | ${String(row.actual_stars).padStart(6)} | ${status}`
      );

      if (!match) {
        mismatches.push({
          id: row.id,
          title: row.title,
          dbCount: row.star_count,
          actualCount: row.actual_stars,
        });
      }
    }

    console.log('\n');

    if (mismatches.length === 0) {
      console.log('🎉 모든 star_count가 정확합니다!');
    } else {
      console.log(`⚠️  발견된 불일치: ${mismatches.length}개\n`);

      for (const m of mismatches) {
        console.log(`❌ ${m.title}`);
        console.log(`   ID: ${m.id}`);
        console.log(`   DB에 저장된 값: ${m.dbCount}`);
        console.log(`   실제 Star 수: ${m.actualCount}`);
        console.log(`   수정 SQL: UPDATE posts SET star_count = ${m.actualCount} WHERE id = '${m.id}';`);
        console.log('');
      }

      console.log('🔧 모든 불일치를 한번에 수정하려면 다음 명령을 실행하세요:');
      console.log('   npm run db:fix-star-counts\n');
    }

    // 전체 통계
    const [stats] = await conn.execute(`
      SELECT
        COUNT(*) as total_posts,
        SUM(star_count) as total_stars_db,
        (SELECT COUNT(*) FROM post_stars) as total_stars_actual
      FROM posts
    `);

    console.log('📈 전체 통계');
    console.log(`   총 게시물: ${stats[0].total_posts}`);
    console.log(`   DB star_count 합계: ${stats[0].total_stars_db}`);
    console.log(`   실제 post_stars 레코드: ${stats[0].total_stars_actual}`);

    if (stats[0].total_stars_db !== stats[0].total_stars_actual) {
      console.log(`   ⚠️  차이: ${Math.abs(stats[0].total_stars_db - stats[0].total_stars_actual)}`);
    } else {
      console.log('   ✅ 전체 합계 일치');
    }

  } catch (err) {
    const msg = err?.code ? `[${err.code}]` : '';
    console.error(`❌ 검증 실패. ${msg}`, err?.message || '');
    process.exitCode = 1;
  } finally {
    if (conn) await conn.end();
  }
}

main();
