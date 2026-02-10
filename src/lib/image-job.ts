/**
 * post_image_job 테이블 작업
 * - 캡처 작업 큐 관리
 */

import { executeQuery } from './db';
import getPool from './db';
import type { ImageKind } from '@/types/post';

export type JobStatus = 'pending' | 'running' | 'success' | 'failed';

interface ImageJob {
  id: number;
  post_id: string;
  kind: ImageKind;
  status: JobStatus;
  attempts: number;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * 캡처 작업 생성 (upsert)
 * - 업로드 후 자동으로 호출
 */
export async function enqueueImageJob(
  postId: string,
  kind: ImageKind
): Promise<void> {
  await executeQuery(
    `INSERT INTO post_image_job (post_id, kind, status, attempts)
     VALUES (?, ?, 'pending', 0)
     ON DUPLICATE KEY UPDATE
       status = IF(status = 'failed', 'pending', status),
       attempts = IF(status = 'failed', 0, attempts),
       updated_at = CURRENT_TIMESTAMP`,
    [postId, kind]
  );
}

/**
 * post의 thumb + og 작업 모두 생성
 */
export async function enqueueAllImageJobs(postId: string): Promise<void> {
  await Promise.all([
    enqueueImageJob(postId, 'thumb'),
    enqueueImageJob(postId, 'og'),
  ]);
}

/**
 * pending 작업 조회 (워커용)
 * @deprecated Use claimJobs instead for atomic job claiming
 */
export async function getPendingJobs(limit: number = 10): Promise<ImageJob[]> {
  const rows = await executeQuery(
    `SELECT id, post_id, kind, status, attempts, last_error,
            DATE_FORMAT(created_at, '%Y-%m-%dT%H:%i:%sZ') AS created_at,
            DATE_FORMAT(updated_at, '%Y-%m-%dT%H:%i:%sZ') AS updated_at
     FROM post_image_job
     WHERE status = 'pending' AND attempts < 3
     ORDER BY created_at ASC
     LIMIT ?`,
    [limit]
  ) as ImageJob[];

  return rows;
}

/**
 * 작업을 원자적으로 클레임 (다중 워커 안전)
 * - SELECT FOR UPDATE SKIP LOCKED로 작업 잠금
 * - status를 running으로 변경
 * - 트랜잭션으로 원자성 보장
 */
export async function claimJobs(limit: number = 10): Promise<ImageJob[]> {
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // SELECT FOR UPDATE SKIP LOCKED로 작업 잠금
    const [rows] = await connection.execute(
      `SELECT id, post_id, kind, status, attempts, last_error,
              DATE_FORMAT(created_at, '%Y-%m-%dT%H:%i:%sZ') AS created_at,
              DATE_FORMAT(updated_at, '%Y-%m-%dT%H:%i:%sZ') AS updated_at
       FROM post_image_job
       WHERE status = 'pending' AND attempts < 3
       ORDER BY created_at ASC
       LIMIT ?
       FOR UPDATE SKIP LOCKED`,
      [limit]
    );

    const jobs = rows as ImageJob[];

    if (jobs.length === 0) {
      await connection.commit();
      return [];
    }

    // 선택된 작업들을 running으로 변경
    const jobIds = jobs.map(j => j.id);
    await connection.execute(
      `UPDATE post_image_job
       SET status = 'running', updated_at = CURRENT_TIMESTAMP
       WHERE id IN (${jobIds.map(() => '?').join(',')})`,
      jobIds
    );

    await connection.commit();
    return jobs;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * 작업 상태를 running으로 변경 (락)
 */
export async function markJobAsRunning(jobId: number): Promise<void> {
  await executeQuery(
    `UPDATE post_image_job
     SET status = 'running', updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND status = 'pending'`,
    [jobId]
  );
}

/**
 * 작업 성공 처리
 */
export async function markJobAsSuccess(jobId: number): Promise<void> {
  await executeQuery(
    `UPDATE post_image_job
     SET status = 'success', updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [jobId]
  );
}

/**
 * 작업 실패 처리
 * - attempts < 3이면 자동으로 pending으로 되돌려 재시도
 * - attempts >= 3이면 failed로 처리
 */
export async function markJobAsFailed(
  jobId: number,
  errorMessage: string
): Promise<void> {
  await executeQuery(
    `UPDATE post_image_job
     SET status = IF(attempts + 1 < 3, 'pending', 'failed'),
         attempts = attempts + 1,
         last_error = ?,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [errorMessage.substring(0, 512), jobId]
  );
}

/**
 * 작업 재시도 (failed → pending)
 */
export async function retryJob(jobId: number): Promise<void> {
  await executeQuery(
    `UPDATE post_image_job
     SET status = 'pending',
         attempts = 0,
         last_error = NULL,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [jobId]
  );
}

/**
 * 작업 조회 (단일)
 */
export async function getJob(jobId: number): Promise<ImageJob | null> {
  const rows = await executeQuery(
    `SELECT id, post_id, kind, status, attempts, last_error,
            DATE_FORMAT(created_at, '%Y-%m-%dT%H:%i:%sZ') AS created_at,
            DATE_FORMAT(updated_at, '%Y-%m-%dT%H:%i:%sZ') AS updated_at
     FROM post_image_job
     WHERE id = ?`,
    [jobId]
  ) as ImageJob[];

  return rows.length > 0 ? rows[0] : null;
}

/**
 * post의 모든 작업 조회
 */
export async function getJobsByPostId(postId: string): Promise<ImageJob[]> {
  const rows = await executeQuery(
    `SELECT id, post_id, kind, status, attempts, last_error,
            DATE_FORMAT(created_at, '%Y-%m-%dT%H:%i:%sZ') AS created_at,
            DATE_FORMAT(updated_at, '%Y-%m-%dT%H:%i:%sZ') AS updated_at
     FROM post_image_job
     WHERE post_id = ?
     ORDER BY kind`,
    [postId]
  ) as ImageJob[];

  return rows;
}
