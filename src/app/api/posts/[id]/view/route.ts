import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export const maxDuration = 10;

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Invalid post id' }, { status: 400 });
    }

    const result = await executeQuery(
      `UPDATE posts
       SET view_count = view_count + 1
       WHERE id = ? AND status = 'published'`,
      [id]
    ) as { affectedRows?: number };

    if (!result || !result.affectedRows) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Fetch the updated view_count
    const rows = await executeQuery(
      `SELECT view_count FROM posts WHERE id = ?`,
      [id]
    ) as { view_count: number }[];

    const view_count = rows[0]?.view_count ?? 0;

    return NextResponse.json({ ok: true, view_count });
  } catch (error) {
    console.error('POST /api/posts/[id]/view failed:', error);
    return NextResponse.json({ error: 'Failed to increment view count' }, { status: 500 });
  }
}
