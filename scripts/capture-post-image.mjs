/**
 * 수동 이미지 캡처 스크립트
 * - 특정 post 또는 모든 post의 썸네일/OG 이미지 생성
 *
 * 사용법:
 *   node scripts/capture-post-image.mjs <post-id>           # 특정 post의 thumb + og 생성
 *   node scripts/capture-post-image.mjs <post-id> thumb     # 특정 post의 thumb만 생성
 *   node scripts/capture-post-image.mjs <post-id> og        # 특정 post의 og만 생성
 *   node scripts/capture-post-image.mjs --all               # 모든 post의 이미지 생성
 *   node scripts/capture-post-image.mjs --all thumb         # 모든 post의 thumb만 생성
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env.local') });

// DB 쿼리 함수
import { createConnection } from 'mysql2/promise';

async function getConnection() {
  return await createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  });
}

async function getAllPublishedPostIds(conn) {
  const [rows] = await conn.execute(
    `SELECT id FROM posts WHERE status = 'published' ORDER BY created_at DESC`
  );
  return rows.map(r => r.id);
}

// 캡처 함수 동적 import (ESM)
async function captureImages(postId, kind) {
  const { capturePostImage, captureAllImagesForPost } = await import('../src/lib/capture-post-image.ts');

  if (kind === 'both') {
    return await captureAllImagesForPost(postId);
  } else {
    return await capturePostImage({ postId, kind });
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage:');
    console.error('  node scripts/capture-post-image.mjs <post-id> [thumb|og]');
    console.error('  node scripts/capture-post-image.mjs --all [thumb|og]');
    process.exit(1);
  }

  const isAll = args[0] === '--all';
  const postIdArg = isAll ? null : args[0];
  const kindArg = args[1] || 'both';

  // kind 검증
  const validKinds = ['thumb', 'og', 'both'];
  if (!validKinds.includes(kindArg)) {
    console.error(`Invalid kind: ${kindArg}. Must be one of: ${validKinds.join(', ')}`);
    process.exit(1);
  }

  let conn;
  try {
    conn = await getConnection();
    console.log('✅ DB connected');

    let postIds = [];
    if (isAll) {
      postIds = await getAllPublishedPostIds(conn);
      console.log(`📋 Found ${postIds.length} published posts`);
    } else {
      postIds = [postIdArg];
    }

    if (postIds.length === 0) {
      console.log('⚠️  No posts to capture');
      return;
    }

    let successCount = 0;
    let failCount = 0;

    for (const postId of postIds) {
      console.log(`\n🎯 Processing post: ${postId}`);

      try {
        if (kindArg === 'both') {
          const { thumb, og } = await captureImages(postId, 'both');
          if (thumb.success) {
            console.log(`  ✅ thumb: ${thumb.bytes} bytes`);
            successCount++;
          } else {
            console.error(`  ❌ thumb: ${thumb.error}`);
            failCount++;
          }
          if (og.success) {
            console.log(`  ✅ og: ${og.bytes} bytes`);
            successCount++;
          } else {
            console.error(`  ❌ og: ${og.error}`);
            failCount++;
          }
        } else {
          const result = await captureImages(postId, kindArg);
          if (result.success) {
            console.log(`  ✅ ${kindArg}: ${result.bytes} bytes`);
            successCount++;
          } else {
            console.error(`  ❌ ${kindArg}: ${result.error}`);
            failCount++;
          }
        }
      } catch (err) {
        console.error(`  ❌ Error: ${err.message}`);
        failCount++;
      }
    }

    console.log(`\n🎉 Capture complete`);
    console.log(`   Success: ${successCount}`);
    console.log(`   Failed: ${failCount}`);
  } catch (err) {
    console.error('❌ Script failed:', err.message);
    process.exitCode = 1;
  } finally {
    if (conn) await conn.end();
  }
}

main();
