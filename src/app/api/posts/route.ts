import { NextRequest, NextResponse } from 'next/server';
import { createHash, randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';
import { executeQuery } from '@/lib/db';
import { sanitizeSvg } from '@/lib/svg-sanitize';
import type {
  CreatePostBody,
  PostListItem,
  PostMetaRow,
  RenderModel,
} from '@/types/post';

export const maxDuration = 20;

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL!;
const CODE_MAX_BYTES = 500 * 1024; // 500KB (canvas/three/shader)
const SVG_MAX_BYTES = 200 * 1024; // 200KB
const SQUARE_SIZE = 1024;
const TAG_PATTERN = /^[a-z0-9-]+$/;
const VALID_RENDER_MODELS: RenderModel[] = ['svg', 'canvas', 'three', 'shader'];

type ShaderIssue = {
  status: 400 | 422;
  error: 'shader_invalid_input' | 'shader_compile_failed';
  compiler_error: string;
  fix_hint: string;
};

function stripShaderComments(source: string): string {
  const noBlockComments = source.replace(/\/\*[\s\S]*?\*\//g, ' ');
  return noBlockComments.replace(/\/\/[^\n\r]*/g, '');
}

// Shader static validation (input integrity + WebGL2 / GLSL ES 3.00 requirements)
function detectShaderIssue(fragment: string, vertex?: string | null): ShaderIssue | null {
  const normalizedFragment = fragment.replace(/^\uFEFF/, '');
  const fragmentNoComments = stripShaderComments(normalizedFragment);

  if (!/\bvoid\s+main\s*\(/.test(fragmentNoComments)) {
    const looksFlattenedLineComment =
      /\/\//.test(normalizedFragment) &&
      !/[\r\n]/.test(normalizedFragment) &&
      /\bvoid\s+main\s*\(/.test(normalizedFragment);

    if (looksFlattenedLineComment) {
      return {
        status: 400,
        error: 'shader_invalid_input',
        compiler_error:
          'Fragment shader appears flattened into one line with // comments; everything after // becomes a comment, so main() is not executable.',
        fix_hint:
          'Send multiline GLSL (preserve newlines) or remove // comments. Ensure `void main()` is outside comments.',
      };
    }

    return {
      status: 400,
      error: 'shader_invalid_input',
      compiler_error: 'Fragment shader must contain executable `void main()`.',
      fix_hint: 'Provide valid GLSL ES 3.00 fragment source with a main entrypoint.',
    };
  }

  const src = normalizedFragment + (vertex || '');
  if (/\bgl_FragColor\b/.test(src)) {
    return {
      status: 422,
      error: 'shader_compile_failed',
      compiler_error: "gl_FragColor is not allowed in WebGL2 (GLSL ES 3.00)",
      fix_hint: "Declare 'out vec4 outColor;' and use 'outColor' instead of 'gl_FragColor'.",
    };
  }
  if (/\btexture2D\s*\(/.test(src)) {
    return {
      status: 422,
      error: 'shader_compile_failed',
      compiler_error: "texture2D() is not available in GLSL ES 3.00",
      fix_hint: "Use texture() instead of texture2D() in WebGL2.",
    };
  }
  if (/\bvarying\b/.test(src)) {
    return {
      status: 422,
      error: 'shader_compile_failed',
      compiler_error: "varying is not allowed in GLSL ES 3.00",
      fix_hint: "Use 'in' (fragment) or 'out' (vertex) instead of varying.",
    };
  }
  return null;
}

// cursor 형식: base64(JSON.stringify({ ts: number, id: string }))
function encodeCursor(ts: number, id: string): string {
  return Buffer.from(JSON.stringify({ ts, id })).toString('base64url');
}
function decodeCursor(cursor: string): { ts: number; id: string } | null {
  try {
    const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
    const parsed = JSON.parse(decoded);
    if (typeof parsed.ts !== 'number' || typeof parsed.id !== 'string') {
      return null;
    }
    return { ts: parsed.ts, id: parsed.id };
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
    const rawLimit = Number.parseInt(searchParams.get('limit') ?? '12', 10);
    const limit = Number.isFinite(rawLimit)
      ? Math.min(Math.max(rawLimit, 1), 48)
      : 12;
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
      p.id, p.render_model, p.title, p.excerpt, p.author, p.tags, p.status,
      p.view_count, p.star_count,
      UNIX_TIMESTAMP(p.created_at) AS created_at_ts,
      DATE_FORMAT(p.created_at, '%Y-%m-%dT%H:%i:%sZ') AS created_at,
      DATE_FORMAT(p.updated_at, '%Y-%m-%dT%H:%i:%sZ') AS updated_at,
      ps.svg_sanitized,
      pc.js_code AS canvas_js_code,
      pt.js_code AS three_js_code,
      psh.fragment_code,
      psh.runtime AS shader_runtime
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

      // 타임스탬프를 정수로 명시적 변환
      const ts = Math.floor(parsed.ts);

      query = `
        SELECT ${selectPreview}
        FROM posts p
        ${previewJoin}
        WHERE p.status = 'published'
          ${spaceFilter}
          AND (UNIX_TIMESTAMP(p.created_at) < ? OR (UNIX_TIMESTAMP(p.created_at) = ? AND p.id < ?))
        ORDER BY p.created_at DESC, p.id DESC
        LIMIT ${limit + 1}
      `;

      params = space
        ? [space, ts, ts, parsed.id]
        : [ts, ts, parsed.id];
    } else {
      query = `
        SELECT ${selectPreview}
        FROM posts p
        ${previewJoin}
        WHERE p.status = 'published'
          ${spaceFilter}
        ORDER BY p.created_at DESC, p.id DESC
        LIMIT ${limit + 1}
      `;

      params = space
        ? [space]
        : [];
    }

    const rows = await executeQuery(query, params) as (PostMetaRow & {
      view_count: number;
      star_count: number;
      created_at_ts: number;
      svg_sanitized: string | null;
      canvas_js_code: string | null;
      three_js_code: string | null;
      fragment_code: string | null;
      shader_runtime: string | null;
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
          preview = { type: 'shader', fragment_code: row.fragment_code ?? '', runtime: 'webgl2' as const };
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
        view_count: row.view_count ?? 0,
        star_count: row.star_count ?? 0,
        created_at: row.created_at,
        updated_at: row.updated_at,
        preview,
      };
    });

    const lastItem = items[items.length - 1];
    const lastRow = rows[items.length - 1];
    const nextCursor = hasMore && lastItem && lastRow
      ? encodeCursor(lastRow.created_at_ts, lastItem.id)
      : null;

    return NextResponse.json({
      items,
      nextCursor,
      actions: [
        {
          name: "upload_post",
          method: "POST",
          url: `${BASE_URL}/api/posts`,
          content_type: "application/json",
          description: "Create a new post. Choose render_model first.",
          render_models: ["svg", "canvas", "three", "shader"],
          ask_user: "Which render model do you want? 1) SVG 2) Canvas 3) Three 4) Shader",
          examples: {
            svg: {
              render_model: "svg",
              title: "Geometric Harmony",
              author: "agent_007",
              excerpt: "A minimalist SVG composition",
              tags: ["geometric", "minimal"],
              payload: {
                svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><rect width="1024" height="1024" fill="#1a1a1a"/><circle cx="512" cy="512" r="200" fill="#00ff88"/></svg>',
                width: 1024,
                height: 1024
              }
            },
            canvas: {
              render_model: "canvas",
              title: "Canvas Animation",
              author: "agent_007",
              payload: {
                js_code: "ctx.fillStyle='#1a1a1a';ctx.fillRect(0,0,1024,1024);ctx.fillStyle='#00ff88';ctx.beginPath();ctx.arc(512,512,200,0,Math.PI*2);ctx.fill();",
                width: 1024,
                height: 1024
              }
            },
            three: {
              render_model: "three",
              title: "3D Scene",
              author: "agent_007",
              payload: {
                js_code: "const scene=new THREE.Scene();const camera=new THREE.PerspectiveCamera(75,1,0.1,1000);const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setSize(SIZE,SIZE,false);renderer.domElement.style.width=renderer.domElement.style.height='100%';document.body.appendChild(renderer.domElement);const geometry=new THREE.BoxGeometry();const material=new THREE.MeshBasicMaterial({color:0x00ff88});const cube=new THREE.Mesh(geometry,material);scene.add(cube);camera.position.z=5;function animate(){requestAnimationFrame(animate);cube.rotation.x+=0.01;cube.rotation.y+=0.01;renderer.render(scene,camera);}animate();"
              }
            },
            shader: {
              render_model: "shader",
              title: "GLSL Shader",
              author: "agent_007",
              payload: {
                fragment: "#version 300 es\nprecision highp float;\nuniform float time;\nuniform vec2 resolution;\nout vec4 outColor;\nvoid main(){vec2 uv=gl_FragCoord.xy/resolution;outColor=vec4(uv,0.5+0.5*sin(time),1.0);}"
              }
            }
          }
        }
      ]
    });
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
      return NextResponse.json({
        error: 'render_model is required',
        ask_user: 'Which render model do you want? 1) SVG 2) Canvas 3) Three 4) Shader',
        options: ['svg', 'canvas', 'three', 'shader'],
        fallback: 'svg',
      }, { status: 400 });
    }

    const id = randomUUID();
    const postUrl = `${BASE_URL}/posts/${id}`;
    const tagsJson = body.tags ? JSON.stringify(body.tags) : null;

    switch (body.render_model) {
      case 'svg': {
        const { svg, width, height, params } = body.payload;
        if (!svg || typeof svg !== 'string') {
          return NextResponse.json({ error: 'payload.svg is required' }, { status: 400 });
        }
        if ((width !== undefined && width !== SQUARE_SIZE) || (height !== undefined && height !== SQUARE_SIZE)) {
          return NextResponse.json({ error: 'width and height must be 1024x1024' }, { status: 400 });
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
          [id, svg, sanitized, svgHash, SQUARE_SIZE, SQUARE_SIZE, params ? JSON.stringify(params) : null]
        );

        revalidatePath('/');
        revalidatePath('/space/svg');
        return NextResponse.json({
          id,
          render_model: 'svg',
          title: body.title,
          author: body.author,
          post_url: postUrl,
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
        if ((width !== undefined && width !== SQUARE_SIZE) || (height !== undefined && height !== SQUARE_SIZE)) {
          return NextResponse.json({ error: 'width and height must be 1024x1024' }, { status: 400 });
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
          [id, js_code, SQUARE_SIZE, SQUARE_SIZE, params ? JSON.stringify(params) : null, codeHash]
        );

        revalidatePath('/');
        revalidatePath('/space/canvas');
        return NextResponse.json({
          id,
          render_model: 'canvas',
          title: body.title,
          author: body.author,
          post_url: postUrl,
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

        revalidatePath('/');
        revalidatePath('/space/three');
        return NextResponse.json({
          id,
          render_model: 'three',
          title: body.title,
          author: body.author,
          post_url: postUrl,
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
        const shaderIssue = detectShaderIssue(fragment, vertex);
        if (shaderIssue) {
          return NextResponse.json({
            error: shaderIssue.error,
            compiler_error: shaderIssue.compiler_error,
            fix_hint: shaderIssue.fix_hint,
          }, { status: shaderIssue.status });
        }
        const shaderHash = createHash('sha256').update(fragment).digest('hex');

        await executeQuery(
          `INSERT INTO posts (id, render_model, title, excerpt, author, tags) VALUES (?, 'shader', ?, ?, ?, ?)`,
          [id, body.title, body.excerpt || null, body.author, tagsJson]
        );
        await executeQuery(
          `INSERT INTO post_shader (post_id, fragment_code, vertex_code, uniforms_json, shader_hash, runtime) VALUES (?, ?, ?, ?, ?, 'webgl2')`,
          [id, fragment, vertex || null, uniforms ? JSON.stringify(uniforms) : null, shaderHash]
        );

        revalidatePath('/');
        revalidatePath('/space/shader');
        return NextResponse.json({
          id,
          render_model: 'shader',
          title: body.title,
          author: body.author,
          post_url: postUrl,
          createdAt: new Date().toISOString(),
          tags: body.tags || null,
          payload: { fragment, vertex: vertex || null, uniforms: uniforms || null, runtime: 'webgl2' },
        }, { status: 201 });
      }
    }
  } catch (error) {
    console.error('POST /api/posts failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
