/**
 * post_image 테이블 DB 작업
 * - 이미지 저장/조회
 * - BLOB 데이터 처리
 */

import { executeQuery } from './db';
import type { ImageKind, ImagePreview } from '@/types/post';

interface PostImageRow {
  post_id: string;
  kind: ImageKind;
  mime: string;
  width: number;
  height: number;
  bytes: number;
  data: Buffer;
  sha256: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * 이미지 저장
 */
export async function savePostImage(
  postId: string,
  kind: ImageKind,
  mime: string,
  width: number,
  height: number,
  bytes: number,
  data: Buffer,
  sha256: string | null = null
): Promise<void> {
  await executeQuery(
    `INSERT INTO post_image (post_id, kind, mime, width, height, bytes, data, sha256)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       mime = VALUES(mime),
       width = VALUES(width),
       height = VALUES(height),
       bytes = VALUES(bytes),
       data = VALUES(data),
       sha256 = VALUES(sha256),
       updated_at = CURRENT_TIMESTAMP`,
    [postId, kind, mime, width, height, bytes, data, sha256]
  );
}

/**
 * 이미지 조회 (단일)
 */
export async function getPostImage(
  postId: string,
  kind: ImageKind
): Promise<PostImageRow | null> {
  const rows = await executeQuery(
    `SELECT post_id, kind, mime, width, height, bytes, data, sha256,
            DATE_FORMAT(created_at, '%Y-%m-%dT%H:%i:%sZ') AS created_at,
            DATE_FORMAT(updated_at, '%Y-%m-%dT%H:%i:%sZ') AS updated_at
     FROM post_image
     WHERE post_id = ? AND kind = ?`,
    [postId, kind]
  ) as PostImageRow[];

  return rows.length > 0 ? rows[0] : null;
}

/**
 * 이미지 목록 조회 (post의 모든 이미지)
 */
export async function getPostImages(
  postId: string
): Promise<PostImageRow[]> {
  const rows = await executeQuery(
    `SELECT post_id, kind, mime, width, height, bytes, data, sha256,
            DATE_FORMAT(created_at, '%Y-%m-%dT%H:%i:%sZ') AS created_at,
            DATE_FORMAT(updated_at, '%Y-%m-%dT%H:%i:%sZ') AS updated_at
     FROM post_image
     WHERE post_id = ?
     ORDER BY kind`,
    [postId]
  ) as PostImageRow[];

  return rows;
}

/**
 * 이미지 삭제
 */
export async function deletePostImage(
  postId: string,
  kind: ImageKind
): Promise<void> {
  await executeQuery(
    `DELETE FROM post_image WHERE post_id = ? AND kind = ?`,
    [postId, kind]
  );
}

/**
 * post의 모든 이미지 삭제
 */
export async function deleteAllPostImages(postId: string): Promise<void> {
  await executeQuery(
    `DELETE FROM post_image WHERE post_id = ?`,
    [postId]
  );
}

/**
 * Buffer를 Base64로 변환하여 ImagePreview 형식으로 반환
 */
export function rowToImagePreview(row: PostImageRow, includeData: boolean = false): ImagePreview {
  return {
    kind: row.kind,
    mime: row.mime,
    width: row.width,
    height: row.height,
    bytes: row.bytes,
    sha256: row.sha256,
    created_at: row.created_at,
    data: includeData ? `data:${row.mime};base64,${row.data.toString('base64')}` : undefined,
  };
}

/**
 * 이미지 메타 정보만 조회 (data 제외)
 */
export async function getPostImageMeta(
  postId: string,
  kind: ImageKind
): Promise<Omit<PostImageRow, 'data'> | null> {
  const rows = await executeQuery(
    `SELECT post_id, kind, mime, width, height, bytes, sha256,
            DATE_FORMAT(created_at, '%Y-%m-%dT%H:%i:%sZ') AS created_at,
            DATE_FORMAT(updated_at, '%Y-%m-%dT%H:%i:%sZ') AS updated_at
     FROM post_image
     WHERE post_id = ? AND kind = ?`,
    [postId, kind]
  ) as Omit<PostImageRow, 'data'>[];

  return rows.length > 0 ? rows[0] : null;
}
