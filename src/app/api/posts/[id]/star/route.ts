import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { getOrCreateViewerId } from '@/lib/viewer-id';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';

export const maxDuration = 10;

/**
 * GET /api/posts/{id}/star
 * 현재 사용자의 Star 상태 조회
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Invalid post id' }, { status: 400 });
    }

    const viewerId = await getOrCreateViewerId();

    // 1. 게시물 존재 여부 및 star_count 확인
    const postRows = await executeQuery(
      `SELECT star_count FROM posts WHERE id = ? AND status = 'published'`,
      [id]
    ) as RowDataPacket[];

    if (!postRows || postRows.length === 0) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const starCount = postRows[0].star_count || 0;

    // 2. 현재 사용자가 Star를 눌렀는지 확인
    const starRows = await executeQuery(
      `SELECT 1 FROM post_stars WHERE post_id = ? AND viewer_id = ?`,
      [id, viewerId]
    ) as RowDataPacket[];

    const starred = starRows && starRows.length > 0;

    return NextResponse.json({ starred, star_count: starCount });
  } catch (error) {
    console.error('GET /api/posts/[id]/star failed:', error);
    return NextResponse.json({ error: 'Failed to get star status' }, { status: 500 });
  }
}

/**
 * POST /api/posts/{id}/star
 * Star 토글 (추가/제거)
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Invalid post id' }, { status: 400 });
    }

    const viewerId = await getOrCreateViewerId();

    // 1. 게시물 존재 여부 확인
    const postRows = await executeQuery(
      `SELECT id FROM posts WHERE id = ? AND status = 'published'`,
      [id]
    ) as RowDataPacket[];

    if (!postRows || postRows.length === 0) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // 2. 현재 Star 상태 확인
    const starRows = await executeQuery(
      `SELECT 1 FROM post_stars WHERE post_id = ? AND viewer_id = ?`,
      [id, viewerId]
    ) as RowDataPacket[];

    const alreadyStarred = starRows && starRows.length > 0;

    if (alreadyStarred) {
      // Star 제거 (unstar)
      await executeQuery(
        `DELETE FROM post_stars WHERE post_id = ? AND viewer_id = ?`,
        [id, viewerId]
      ) as ResultSetHeader;

      await executeQuery(
        `UPDATE posts SET star_count = GREATEST(0, star_count - 1) WHERE id = ?`,
        [id]
      ) as ResultSetHeader;
    } else {
      // Star 추가
      await executeQuery(
        `INSERT INTO post_stars (post_id, viewer_id) VALUES (?, ?)`,
        [id, viewerId]
      ) as ResultSetHeader;

      await executeQuery(
        `UPDATE posts SET star_count = star_count + 1 WHERE id = ?`,
        [id]
      ) as ResultSetHeader;
    }

    // 3. 최신 star_count 조회
    const updatedRows = await executeQuery(
      `SELECT star_count FROM posts WHERE id = ?`,
      [id]
    ) as RowDataPacket[];

    const starCount = updatedRows[0]?.star_count || 0;
    const starred = !alreadyStarred;

    return NextResponse.json({ starred, star_count: starCount });
  } catch (error) {
    console.error('POST /api/posts/[id]/star failed:', error);
    return NextResponse.json({ error: 'Failed to toggle star' }, { status: 500 });
  }
}
