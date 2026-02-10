/**
 * 이미지 캡처 큐 워커
 * - pending 작업을 polling하여 캡처 실행
 * - 재시도 로직 포함 (최대 3회)
 *
 * 사용법:
 *   tsx scripts/capture-image-queue.ts           # 한 번 실행 후 종료
 *   tsx scripts/capture-image-queue.ts --watch   # 계속 polling (10초 간격)
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });

import { claimJobs, markJobAsSuccess, markJobAsFailed } from '../src/lib/image-job';
import { capturePostImage } from '../src/lib/capture-post-image';

const BATCH_SIZE = 5; // 한 번에 처리할 작업 수
const POLL_INTERVAL = 10000; // 10초
const MAX_ATTEMPTS = 3;

async function processJob(job: any) {
  console.log(`\n🎯 Processing job #${job.id}: post=${job.post_id}, kind=${job.kind}, attempt=${job.attempts + 1}`);

  try {
    // 캡처 실행 (이미 running 상태로 클레임됨)
    const result = await capturePostImage({
      postId: job.post_id,
      kind: job.kind,
    });

    if (result.success) {
      await markJobAsSuccess(job.id);
      console.log(`✅ Job #${job.id} completed: ${result.bytes} bytes`);
      return { success: true };
    } else {
      // 캡처 실패
      const errorMsg = result.error || 'Unknown error';
      await markJobAsFailed(job.id, errorMsg);
      console.error(`❌ Job #${job.id} failed: ${errorMsg}`);

      if (job.attempts + 1 >= MAX_ATTEMPTS) {
        console.error(`   ⚠️  Max attempts reached, will not retry`);
      }

      return { success: false, error: errorMsg };
    }
  } catch (err: any) {
    const errorMsg = err.message || String(err);
    await markJobAsFailed(job.id, errorMsg);
    console.error(`❌ Job #${job.id} exception: ${errorMsg}`);
    return { success: false, error: errorMsg };
  }
}

async function processBatch() {
  const jobs = await claimJobs(BATCH_SIZE);

  if (jobs.length === 0) {
    console.log('📭 No pending jobs');
    return 0;
  }

  console.log(`📋 Claimed ${jobs.length} job(s)`);

  let successCount = 0;
  let failCount = 0;

  for (const job of jobs) {
    const result = await processJob(job);
    if (result.success) {
      successCount++;
    } else {
      failCount++;
    }
  }

  console.log(`\n📊 Batch complete: ${successCount} success, ${failCount} failed`);
  return jobs.length;
}

async function main() {
  const args = process.argv.slice(2);
  const watchMode = args.includes('--watch');

  console.log('🚀 Image capture queue worker started');
  console.log(`   Mode: ${watchMode ? 'watch (continuous)' : 'once'}`);
  console.log(`   Batch size: ${BATCH_SIZE}`);
  console.log(`   Max attempts: ${MAX_ATTEMPTS}`);

  if (watchMode) {
    console.log(`   Poll interval: ${POLL_INTERVAL}ms`);
  }

  try {
    if (watchMode) {
      // 계속 polling
      while (true) {
        await processBatch();
        console.log(`\n⏳ Waiting ${POLL_INTERVAL / 1000}s...\n`);
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
      }
    } else {
      // 한 번만 실행
      const processed = await processBatch();
      if (processed > 0) {
        console.log('\n✅ Worker finished');
      } else {
        console.log('\n✅ Worker finished (no jobs to process)');
      }
    }
  } catch (err: any) {
    console.error('❌ Worker failed:', err.message);
    process.exitCode = 1;
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Received SIGINT, shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n⚠️  Received SIGTERM, shutting down...');
  process.exit(0);
});

main();
