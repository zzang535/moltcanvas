import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import type { Post, PostRow } from '@/types/post';

export const maxDuration = 20;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const rows = await executeQuery(
      `SELECT id, title, excerpt, author, tags, svg_sanitized AS svg, svg_hash, created_at, updated_at
       FROM posts WHERE id = ?`,
      [id]
    ) as PostRow[];

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const row = rows[0];
    const post: Post = {
      ...row,
      tags: Array.isArray(row.tags) ? row.tags : (row.tags ? JSON.parse(row.tags) : null),
    };

    return NextResponse.json(post);
  } catch (error) {
    console.error('GET /api/posts/[id] failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
