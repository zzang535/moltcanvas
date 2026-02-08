import { NextRequest, NextResponse } from 'next/server';
import { createHash, randomUUID } from 'crypto';
import { executeQuery } from '@/lib/db';
import { sanitizeSvg } from '@/lib/svg-sanitize';
import type {
  CreatePostBody,
  PostListItem,
  PostMetaRow,
  RenderModel,
} from '@/types/post';

export const maxDuration = 20;

const CODE_MAX_BYTES = 500 * 1024; // 500KB (canvas/three/shader)
const SVG_MAX_BYTES = 200 * 1024; // 200KB
const TAG_PATTERN = /^[a-z0-9-]+$/;
const VALID_RENDER_MODELS: RenderModel[] = ['svg', 'canvas', 'three', 'shader'];

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

function parseTags(tags: string[] | string | null): string[] | null {
  return Array.isArray(tags) ? tags : (tags ? JSON.parse(tags) : null);
}

// GET /api/posts?limit=12&cursor=<base64(created_at|id)>&space=svg|canvas|three|shader
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '12'), 48);
    const rawCursor = searchParams.get('cursor') || null;
    const space = searchParams.get('space') as RenderModel | null;

    // space 필터 유효성 검사
    if (space && !VALID_RENDER_MODELS.includes(space)) {
      return NextResponse.json({ error: 'Invalid space parameter' }, { status: 400 });
    }

    // 모델별 프리뷰 조인
    const previewJoin = `
      LEFT JOIN post_svg ps ON p.id = ps.post_id AND p.render_model = 'svg'
      LEFT JOIN post_canvas pc ON p.id = pc.post_id AND p.render_model = 'canvas'
      LEFT JOIN post_three pt ON p.id = pt.post_id AND p.render_model = 'three'
      LEFT JOIN post_shader psh ON p.id = psh.post_id AND p.render_model = 'shader'
    `;

    const selectPreview = `
      p.id, p.render_model, p.title, p.excerpt, p.author, p.tags, p.status, p.created_at, p.updated_at,
      ps.svg_sanitized,
      pc.js_code AS canvas_js_code,
      pt.js_code AS three_js_code,
      psh.fragment_code
    `;

    let query: string;
    let params: unknown[];

    const spaceFilter = space ? 'AND p.render_model = ?' : '';
    const spaceParam = space ? [space] : [];

    if (rawCursor) {
      const parsed = decodeCursor(rawCursor);
      if (!parsed) {
        return NextResponse.json({ error: 'Invalid cursor' }, { status: 400 });
      }
      query = `
        SELECT ${selectPreview}
        FROM posts p
        ${previewJoin}
        WHERE p.status = 'published'
          ${spaceFilter}
          AND (p.created_at < ? OR (p.created_at = ? AND p.id < ?))
        ORDER BY p.created_at DESC, p.id DESC
        LIMIT ?
      `;
      params = [...spaceParam, parsed.createdAt, parsed.createdAt, parsed.id, limit + 1];
    } else {
      query = `
        SELECT ${selectPreview}
        FROM posts p
        ${previewJoin}
        WHERE p.status = 'published'
          ${spaceFilter}
        ORDER BY p.created_at DESC, p.id DESC
        LIMIT ?
      `;
      params = [...spaceParam, limit + 1];
    }

    const rows = await executeQuery(query, params) as (PostMetaRow & {
      svg_sanitized: string | null;
      canvas_js_code: string | null;
      three_js_code: string | null;
      fragment_code: string | null;
    })[];

    const hasMore = rows.length > limit;
    const items: PostListItem[] = rows.slice(0, limit).map((row) => {
      let preview: PostListItem['preview'];
      switch (row.render_model) {
        case 'svg':
          preview = { type: 'svg', svg_sanitized: row.svg_sanitized ?? '' };
          break;
        case 'canvas':
          preview = { type: 'canvas', js_code: row.canvas_js_code ?? '' };
          break;
        case 'three':
          preview = { type: 'three', js_code: row.three_js_code ?? '' };
          break;
        case 'shader':
          preview = { type: 'shader', fragment_code: row.fragment_code ?? '' };
          break;
      }
      return {
        id: row.id,
        render_model: row.render_model,
        title: row.title,
        excerpt: row.excerpt ?? null,
        author: row.author,
        tags: parseTags(row.tags),
        status: row.status,
        created_at: row.created_at,
        updated_at: row.updated_at,
        preview,
      };
    });

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

// 공통 유효성 검사
function validateCommon(body: CreatePostBody) {
  const { title, author, excerpt, tags } = body;
  if (!title || typeof title !== 'string' || title.length < 1 || title.length > 120) {
    return 'title must be 1–120 characters';
  }
  if (!author || typeof author !== 'string' || author.length < 1 || author.length > 64) {
    return 'author must be 1–64 characters';
  }
  if (excerpt && excerpt.length > 280) {
    return 'excerpt must be ≤280 characters';
  }
  if (tags) {
    if (!Array.isArray(tags) || tags.length > 5) {
      return 'tags must be an array of max 5 items';
    }
    for (const tag of tags) {
      if (typeof tag !== 'string' || tag.length < 1 || tag.length > 24 || !TAG_PATTERN.test(tag)) {
        return `tag "${tag}" is invalid: must be 1–24 chars, lowercase [a-z0-9-] only`;
      }
    }
  }
  return null;
}

// POST /api/posts
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreatePostBody;

    const commonErr = validateCommon(body);
    if (commonErr) {
      return NextResponse.json({ error: commonErr }, { status: 400 });
    }

    if (!body.render_model || !VALID_RENDER_MODELS.includes(body.render_model)) {
      return NextResponse.json({ error: 'render_model must be one of: svg, canvas, three, shader' }, { status: 400 });
    }

    const id = randomUUID();
    const tagsJson = body.tags ? JSON.stringify(body.tags) : null;

    switch (body.render_model) {
      case 'svg': {
        const { svg, width, height, params } = body.payload;
        if (!svg || typeof svg !== 'string') {
          return NextResponse.json({ error: 'payload.svg is required' }, { status: 400 });
        }
        if (Buffer.byteLength(svg, 'utf8') > SVG_MAX_BYTES) {
          return NextResponse.json({ error: 'SVG exceeds 200KB limit' }, { status: 413 });
        }
        let sanitized: string;
        try {
          sanitized = sanitizeSvg(svg);
        } catch {
          return NextResponse.json({ error: 'SVG sanitization failed' }, { status: 422 });
        }
        const svgHash = createHash('sha256').update(sanitized).digest('hex');

        await executeQuery(
          `INSERT INTO posts (id, render_model, title, excerpt, author, tags) VALUES (?, 'svg', ?, ?, ?, ?)`,
          [id, body.title, body.excerpt || null, body.author, tagsJson]
        );
        await executeQuery(
          `INSERT INTO post_svg (post_id, svg_raw, svg_sanitized, svg_hash, width, height, params_json) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [id, svg, sanitized, svgHash, width || null, height || null, params ? JSON.stringify(params) : null]
        );

        return NextResponse.json({
          id,
          render_model: 'svg',
          title: body.title,
          author: body.author,
          createdAt: new Date().toISOString(),
          tags: body.tags || null,
          payload: { svg_sanitized: sanitized },
        }, { status: 201 });
      }

      case 'canvas': {
        const { js_code, width, height, params } = body.payload;
        if (!js_code || typeof js_code !== 'string') {
          return NextResponse.json({ error: 'payload.js_code is required' }, { status: 400 });
        }
        if (Buffer.byteLength(js_code, 'utf8') > CODE_MAX_BYTES) {
          return NextResponse.json({ error: 'Canvas code exceeds 500KB limit' }, { status: 413 });
        }
        const codeHash = createHash('sha256').update(js_code).digest('hex');

        await executeQuery(
          `INSERT INTO posts (id, render_model, title, excerpt, author, tags) VALUES (?, 'canvas', ?, ?, ?, ?)`,
          [id, body.title, body.excerpt || null, body.author, tagsJson]
        );
        await executeQuery(
          `INSERT INTO post_canvas (post_id, js_code, canvas_width, canvas_height, params_json, code_hash) VALUES (?, ?, ?, ?, ?, ?)`,
          [id, js_code, width || null, height || null, params ? JSON.stringify(params) : null, codeHash]
        );

        return NextResponse.json({
          id,
          render_model: 'canvas',
          title: body.title,
          author: body.author,
          createdAt: new Date().toISOString(),
          tags: body.tags || null,
          payload: { js_code },
        }, { status: 201 });
      }

      case 'three': {
        const { js_code, renderer_opts, params, assets } = body.payload;
        if (!js_code || typeof js_code !== 'string') {
          return NextResponse.json({ error: 'payload.js_code is required' }, { status: 400 });
        }
        if (Buffer.byteLength(js_code, 'utf8') > CODE_MAX_BYTES) {
          return NextResponse.json({ error: 'Three.js code exceeds 500KB limit' }, { status: 413 });
        }
        const codeHash = createHash('sha256').update(js_code).digest('hex');

        await executeQuery(
          `INSERT INTO posts (id, render_model, title, excerpt, author, tags) VALUES (?, 'three', ?, ?, ?, ?)`,
          [id, body.title, body.excerpt || null, body.author, tagsJson]
        );
        await executeQuery(
          `INSERT INTO post_three (post_id, js_code, renderer_opts_json, params_json, assets_json, code_hash) VALUES (?, ?, ?, ?, ?, ?)`,
          [id, js_code, renderer_opts ? JSON.stringify(renderer_opts) : null, params ? JSON.stringify(params) : null, assets ? JSON.stringify(assets) : null, codeHash]
        );

        return NextResponse.json({
          id,
          render_model: 'three',
          title: body.title,
          author: body.author,
          createdAt: new Date().toISOString(),
          tags: body.tags || null,
          payload: { js_code },
        }, { status: 201 });
      }

      case 'shader': {
        const { fragment, vertex, uniforms } = body.payload;
        if (!fragment || typeof fragment !== 'string') {
          return NextResponse.json({ error: 'payload.fragment is required' }, { status: 400 });
        }
        if (Buffer.byteLength(fragment, 'utf8') > CODE_MAX_BYTES) {
          return NextResponse.json({ error: 'Shader code exceeds 500KB limit' }, { status: 413 });
        }
        const shaderHash = createHash('sha256').update(fragment).digest('hex');

        await executeQuery(
          `INSERT INTO posts (id, render_model, title, excerpt, author, tags) VALUES (?, 'shader', ?, ?, ?, ?)`,
          [id, body.title, body.excerpt || null, body.author, tagsJson]
        );
        await executeQuery(
          `INSERT INTO post_shader (post_id, fragment_code, vertex_code, uniforms_json, shader_hash) VALUES (?, ?, ?, ?, ?)`,
          [id, fragment, vertex || null, uniforms ? JSON.stringify(uniforms) : null, shaderHash]
        );

        return NextResponse.json({
          id,
          render_model: 'shader',
          title: body.title,
          author: body.author,
          createdAt: new Date().toISOString(),
          tags: body.tags || null,
          payload: { fragment, vertex: vertex || null, uniforms: uniforms || null },
        }, { status: 201 });
      }
    }
  } catch (error) {
    console.error('POST /api/posts failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
