export type RenderModel = 'svg' | 'canvas' | 'three' | 'shader';
export type PostStatus = 'published' | 'quarantined' | 'deleted';

// 공통 메타 필드
export interface PostMeta {
  id: string;
  render_model: RenderModel;
  title: string;
  excerpt: string | null;
  author: string;
  tags: string[] | null;
  status: PostStatus;
  view_count?: number;
  star_count?: number;
  created_at: string;
  updated_at: string;
}

// DB 로우 타입 (mysql2 JSON 파싱 전)
export interface PostMetaRow extends Omit<PostMeta, 'tags'> {
  tags: string[] | string | null;
}

// 모델별 payload 타입
export interface SvgPayload {
  svg_raw: string;
  svg_sanitized: string;
  svg_hash: string;
  width?: number | null;
  height?: number | null;
  params?: Record<string, unknown> | null;
}

export interface CanvasPayload {
  js_code: string;
  width?: number | null;
  height?: number | null;
  params?: Record<string, unknown> | null;
  code_hash?: string | null;
}

export interface ThreePayload {
  js_code: string;
  renderer_opts?: Record<string, unknown> | null;
  params?: Record<string, unknown> | null;
  assets?: Record<string, unknown> | null;
  code_hash?: string | null;
}

export interface ShaderPayload {
  fragment_code: string;
  vertex_code?: string | null;
  uniforms?: Record<string, unknown> | null;
  shader_hash?: string | null;
  runtime: 'webgl2';
}

// 완전한 Post 타입 (메타 + payload)
export type Post =
  | (PostMeta & { render_model: 'svg'; payload: SvgPayload })
  | (PostMeta & { render_model: 'canvas'; payload: CanvasPayload })
  | (PostMeta & { render_model: 'three'; payload: ThreePayload })
  | (PostMeta & { render_model: 'shader'; payload: ShaderPayload });

// API 요청 body 타입 (모델별 payload 포함)
export type CreatePostBody =
  | {
      render_model: 'svg';
      title: string;
      author: string;
      excerpt?: string;
      tags?: string[];
      payload: {
        svg: string;
        width?: number;
        height?: number;
        params?: Record<string, unknown>;
      };
    }
  | {
      render_model: 'canvas';
      title: string;
      author: string;
      excerpt?: string;
      tags?: string[];
      payload: {
        js_code: string;
        width?: number;
        height?: number;
        params?: Record<string, unknown>;
      };
    }
  | {
      render_model: 'three';
      title: string;
      author: string;
      excerpt?: string;
      tags?: string[];
      payload: {
        js_code: string;
        renderer_opts?: Record<string, unknown>;
        params?: Record<string, unknown>;
        assets?: Record<string, unknown>;
      };
    }
  | {
      render_model: 'shader';
      title: string;
      author: string;
      excerpt?: string;
      tags?: string[];
      payload: {
        fragment: string;
        vertex?: string | null;
        uniforms?: Record<string, unknown>;
      };
    };

// 리스트 응답용 (payload 없이 preview 포함)
export interface PostListItem {
  id: string;
  render_model: RenderModel;
  title: string;
  excerpt: string | null;
  author: string;
  tags: string[] | null;
  status: PostStatus;
  view_count?: number;
  star_count?: number;
  created_at: string;
  updated_at: string;
  // 모델별 프리뷰 데이터
  preview: SvgPreview | CanvasPreview | ThreePreview | ShaderPreview;
}

export interface SvgPreview { type: 'svg'; svg_sanitized: string }
export interface CanvasPreview { type: 'canvas'; js_code: string }
export interface ThreePreview { type: 'three'; js_code: string }
export interface ShaderPreview { type: 'shader'; fragment_code: string; runtime: 'webgl2' }

export interface PostListResponse {
  items: PostListItem[];
  nextCursor: string | null;
}
