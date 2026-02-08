import { NextRequest, NextResponse } from 'next/server';
import { createHash, randomUUID } from 'crypto';
import { executeQuery } from '@/lib/db';
import { sanitizeSvg } from '@/lib/svg-sanitize';
import type { CreatePostBody, Post, PostRow } from '@/types/post';

export const maxDuration = 20;

const SVG_MAX_BYTES = 200 * 1024; // 200KB
const TAG_PATTERN = /^[a-z0-9-]+$/;

// cursor 형식: base64(created_at|id)
function encodeCursor(createdAt: string, id: string): string {
  return Buffer.from(`${createdAt}|${id}`).toString('base64url');
}
function decodeCursor(cursor: string): { createdAt: string; id: string } | null {
  try {
    const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
    const sep = decoded.lastIndexOf('|');
    if (sep === -1) return null;
    return { createdAt: decoded.slice(0, sep), id: decoded.slice(sep + 1) };
  } catch {
    return null;
  }
}

function parsePost(row: PostRow): Post {
  return {
    ...row,
    tags: row.tags ? JSON.parse(row.tags) : null,
  };
}

// GET /api/posts?limit=12&cursor=<base64(created_at|id)>
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '12'), 48);
    const rawCursor = searchParams.get('cursor') || null;

    let query: string;
    let params: unknown[];

    if (rawCursor) {
      const parsed = decodeCursor(rawCursor);
      if (!parsed) {
        return NextResponse.json({ error: 'Invalid cursor' }, { status: 400 });
      }
      // (created_at, id) 복합 조건으로 안정적인 페이지네이션
      query = `
        SELECT id, title, excerpt, author, tags, svg_sanitized AS svg, created_at, updated_at
        FROM posts
        WHERE (created_at < ? OR (created_at = ? AND id < ?))
        ORDER BY created_at DESC, id DESC
        LIMIT ?
      `;
      params = [parsed.createdAt, parsed.createdAt, parsed.id, limit + 1];
    } else {
      query = `
        SELECT id, title, excerpt, author, tags, svg_sanitized AS svg, created_at, updated_at
        FROM posts
        ORDER BY created_at DESC, id DESC
        LIMIT ?
      `;
      params = [limit + 1];
    }

    const rows = await executeQuery(query, params) as PostRow[];

    const hasMore = rows.length > limit;
    const items = rows.slice(0, limit).map(parsePost);
    const lastItem = items[items.length - 1];
    const nextCursor = hasMore && lastItem
      ? encodeCursor(lastItem.created_at, lastItem.id)
      : null;

    return NextResponse.json({ items, nextCursor });
  } catch (error) {
    console.error('GET /api/posts failed:', error);
    return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
  }
}

// POST /api/posts
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreatePostBody;
    const { title, svg, author, excerpt, tags } = body;

    // 유효성 검사
    if (!title || typeof title !== 'string' || title.length < 1 || title.length > 120) {
      return NextResponse.json({ error: 'title must be 1–120 characters' }, { status: 400 });
    }
    if (!author || typeof author !== 'string' || author.length < 1 || author.length > 64) {
      return NextResponse.json({ error: 'author must be 1–64 characters' }, { status: 400 });
    }
    if (!svg || typeof svg !== 'string') {
      return NextResponse.json({ error: 'svg is required' }, { status: 400 });
    }
    if (Buffer.byteLength(svg, 'utf8') > SVG_MAX_BYTES) {
      return NextResponse.json({ error: 'SVG exceeds 200KB limit' }, { status: 413 });
    }
    if (excerpt && excerpt.length > 280) {
      return NextResponse.json({ error: 'excerpt must be ≤280 characters' }, { status: 400 });
    }
    if (tags) {
      if (!Array.isArray(tags) || tags.length > 5) {
        return NextResponse.json({ error: 'tags must be an array of max 5 items' }, { status: 400 });
      }
      for (const tag of tags) {
        if (typeof tag !== 'string' || tag.length < 1 || tag.length > 24 || !TAG_PATTERN.test(tag)) {
          return NextResponse.json(
            { error: `tag "${tag}" is invalid: must be 1–24 chars, lowercase [a-z0-9-] only` },
            { status: 400 }
          );
        }
      }
    }

    // SVG sanitize (원본 svg_raw 저장, 응답에는 svg_sanitized만 반환)
    let sanitized: string;
    try {
      sanitized = sanitizeSvg(svg);
    } catch {
      return NextResponse.json({ error: 'SVG sanitization failed' }, { status: 422 });
    }

    const id = randomUUID();
    // svg_hash = sha256(svg_sanitized) — 중복 감지 및 스팸 방지용
    const svgHash = createHash('sha256').update(sanitized).digest('hex');
    const tagsJson = tags ? JSON.stringify(tags) : null;

    // svg_raw: 원본 보존(감사/디버그용), 응답에는 포함하지 않음
    await executeQuery(
      `INSERT INTO posts (id, title, excerpt, author, tags, svg_raw, svg_sanitized, svg_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, title, excerpt || null, author, tagsJson, svg, sanitized, svgHash]
    );

    return NextResponse.json(
      {
        id,
        title,
        author,
        createdAt: new Date().toISOString(),
        tags: tags || null,
        svg: sanitized, // sanitized 결과만 반환
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/posts failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
