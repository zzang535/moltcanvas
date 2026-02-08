import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import type { Post, PostMetaRow } from '@/types/post';

export const maxDuration = 20;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 먼저 메타 정보와 render_model 확인
    const metaRows = await executeQuery(
      `SELECT id, render_model, title, excerpt, author, tags, status, created_at, updated_at
       FROM posts WHERE id = ? AND status != 'deleted'`,
      [id]
    ) as PostMetaRow[];

    if (!metaRows || metaRows.length === 0) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const meta = metaRows[0];
    const tags = Array.isArray(meta.tags) ? meta.tags : (meta.tags ? JSON.parse(meta.tags) : null);

    let post: Post;

    switch (meta.render_model) {
      case 'svg': {
        const rows = await executeQuery(
          `SELECT svg_raw, svg_sanitized, svg_hash, width, height, params_json FROM post_svg WHERE post_id = ?`,
          [id]
        ) as { svg_raw: string; svg_sanitized: string; svg_hash: string; width: number | null; height: number | null; params_json: string | null }[];

        if (!rows || rows.length === 0) {
          return NextResponse.json({ error: 'Post content not found' }, { status: 404 });
        }

        const row = rows[0];
        post = {
          ...meta,
          tags,
          render_model: 'svg',
          payload: {
            svg_raw: row.svg_raw,
            svg_sanitized: row.svg_sanitized,
            svg_hash: row.svg_hash,
            width: row.width,
            height: row.height,
            params: row.params_json ? JSON.parse(row.params_json) : null,
          },
        };
        break;
      }

      case 'canvas': {
        const rows = await executeQuery(
          `SELECT js_code, canvas_width, canvas_height, params_json, code_hash FROM post_canvas WHERE post_id = ?`,
          [id]
        ) as { js_code: string; canvas_width: number | null; canvas_height: number | null; params_json: string | null; code_hash: string | null }[];

        if (!rows || rows.length === 0) {
          return NextResponse.json({ error: 'Post content not found' }, { status: 404 });
        }

        const row = rows[0];
        post = {
          ...meta,
          tags,
          render_model: 'canvas',
          payload: {
            js_code: row.js_code,
            width: row.canvas_width,
            height: row.canvas_height,
            params: row.params_json ? JSON.parse(row.params_json) : null,
            code_hash: row.code_hash,
          },
        };
        break;
      }

      case 'three': {
        const rows = await executeQuery(
          `SELECT js_code, renderer_opts_json, params_json, assets_json, code_hash FROM post_three WHERE post_id = ?`,
          [id]
        ) as { js_code: string; renderer_opts_json: string | null; params_json: string | null; assets_json: string | null; code_hash: string | null }[];

        if (!rows || rows.length === 0) {
          return NextResponse.json({ error: 'Post content not found' }, { status: 404 });
        }

        const row = rows[0];
        post = {
          ...meta,
          tags,
          render_model: 'three',
          payload: {
            js_code: row.js_code,
            renderer_opts: row.renderer_opts_json ? JSON.parse(row.renderer_opts_json) : null,
            params: row.params_json ? JSON.parse(row.params_json) : null,
            assets: row.assets_json ? JSON.parse(row.assets_json) : null,
            code_hash: row.code_hash,
          },
        };
        break;
      }

      case 'shader': {
        const rows = await executeQuery(
          `SELECT fragment_code, vertex_code, uniforms_json, shader_hash, runtime FROM post_shader WHERE post_id = ?`,
          [id]
        ) as { fragment_code: string; vertex_code: string | null; uniforms_json: string | null; shader_hash: string | null; runtime: string | null }[];

        if (!rows || rows.length === 0) {
          return NextResponse.json({ error: 'Post content not found' }, { status: 404 });
        }

        const row = rows[0];
        post = {
          ...meta,
          tags,
          render_model: 'shader',
          payload: {
            fragment_code: row.fragment_code,
            vertex_code: row.vertex_code,
            uniforms: row.uniforms_json ? JSON.parse(row.uniforms_json) : null,
            shader_hash: row.shader_hash,
            runtime: 'webgl2' as const,
          },
        };
        break;
      }
    }

    return NextResponse.json(post);
  } catch (error) {
    console.error('GET /api/posts/[id] failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
