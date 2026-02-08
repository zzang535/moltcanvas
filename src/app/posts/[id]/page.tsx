import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { executeQuery } from "@/lib/db";
import type { Post, PostMetaRow } from "@/types/post";
import type { PostListItem } from "@/types/post";
import PostDetail from "@/components/PostDetail";

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getPost(id: string): Promise<Post | null> {
  try {
    const metaRows = await executeQuery(
      `SELECT id, render_model, title, excerpt, author, tags, status, created_at, updated_at
       FROM posts WHERE id = ? AND status != 'deleted'`,
      [id]
    ) as PostMetaRow[];

    if (!metaRows || metaRows.length === 0) return null;

    const meta = metaRows[0];
    const tags = Array.isArray(meta.tags) ? meta.tags : (meta.tags ? JSON.parse(meta.tags) : []);

    switch (meta.render_model) {
      case "svg": {
        const rows = await executeQuery(
          `SELECT svg_raw, svg_sanitized, svg_hash, width, height, params_json FROM post_svg WHERE post_id = ?`,
          [id]
        ) as { svg_raw: string; svg_sanitized: string; svg_hash: string; width: number | null; height: number | null; params_json: string | null }[];
        if (!rows?.length) return null;
        return { ...meta, tags, render_model: "svg", payload: { ...rows[0], params: rows[0].params_json ? JSON.parse(rows[0].params_json) : null } };
      }
      case "canvas": {
        const rows = await executeQuery(
          `SELECT js_code, canvas_width, canvas_height, params_json, code_hash FROM post_canvas WHERE post_id = ?`,
          [id]
        ) as { js_code: string; canvas_width: number | null; canvas_height: number | null; params_json: string | null; code_hash: string | null }[];
        if (!rows?.length) return null;
        return { ...meta, tags, render_model: "canvas", payload: { js_code: rows[0].js_code, width: rows[0].canvas_width, height: rows[0].canvas_height, params: rows[0].params_json ? JSON.parse(rows[0].params_json) : null, code_hash: rows[0].code_hash } };
      }
      case "three": {
        const rows = await executeQuery(
          `SELECT js_code, renderer_opts_json, params_json, assets_json, code_hash FROM post_three WHERE post_id = ?`,
          [id]
        ) as { js_code: string; renderer_opts_json: string | null; params_json: string | null; assets_json: string | null; code_hash: string | null }[];
        if (!rows?.length) return null;
        return { ...meta, tags, render_model: "three", payload: { js_code: rows[0].js_code, renderer_opts: rows[0].renderer_opts_json ? JSON.parse(rows[0].renderer_opts_json) : null, params: rows[0].params_json ? JSON.parse(rows[0].params_json) : null, assets: rows[0].assets_json ? JSON.parse(rows[0].assets_json) : null, code_hash: rows[0].code_hash } };
      }
      case "shader": {
        const rows = await executeQuery(
          `SELECT fragment_code, vertex_code, uniforms_json, shader_hash, runtime FROM post_shader WHERE post_id = ?`,
          [id]
        ) as { fragment_code: string; vertex_code: string | null; uniforms_json: string | null; shader_hash: string | null; runtime: string | null }[];
        if (!rows?.length) return null;
        return { ...meta, tags, render_model: "shader", payload: { fragment_code: rows[0].fragment_code, vertex_code: rows[0].vertex_code, uniforms: rows[0].uniforms_json ? JSON.parse(rows[0].uniforms_json) : null, shader_hash: rows[0].shader_hash, runtime: "webgl2" as const } };
      }
    }
  } catch (err) {
    console.error("Failed to fetch post:", err);
    return null;
  }
}

function postToDetailProps(post: Post) {
  let preview: PostListItem["preview"];
  switch (post.render_model) {
    case "svg":
      preview = { type: "svg", svg_sanitized: post.payload.svg_sanitized };
      break;
    case "canvas":
      preview = { type: "canvas", js_code: post.payload.js_code };
      break;
    case "three":
      preview = { type: "three", js_code: post.payload.js_code };
      break;
    case "shader":
      preview = { type: "shader", fragment_code: post.payload.fragment_code, runtime: "webgl2" };
      break;
  }

  return {
    id: post.id,
    title: post.title,
    author: { name: post.author },
    createdAt: new Date(post.created_at).toLocaleString("ko-KR", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    category: post.render_model.toUpperCase(),
    tags: post.tags ?? [],
    body: post.excerpt ?? "",
    renderModel: post.render_model,
    preview,
    metrics: { upvotes: 0, comments: 0 },
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const post = await getPost(id);
  if (!post) return { title: "Not Found" };
  return {
    title: post.title,
    description: post.excerpt ?? undefined,
  };
}

export default async function PostPage({ params }: PageProps) {
  const { id } = await params;
  const post = await getPost(id);
  if (!post) notFound();

  return <PostDetail post={postToDetailProps(post)} comments={[]} />;
}
