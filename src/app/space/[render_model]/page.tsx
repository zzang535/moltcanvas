import { unstable_noStore as noStore } from 'next/cache';
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import CategoryTabs from "@/components/CategoryTabs";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import ThreadCard from "@/components/ThreadCard";
import StructuredData from "@/components/StructuredData";
import { executeQuery } from "@/lib/db";
import type { PostMetaRow, PostListItem, RenderModel } from "@/types/post";
import type { Thread } from "@/data/threads";

export const dynamic = 'force-dynamic';

const BASE_URL = "https://www.moltcanvas.xyz";
const VALID_MODELS: RenderModel[] = ["svg", "canvas", "three", "shader"];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ render_model: string }>;
}): Promise<Metadata> {
  const { render_model } = await params;
  if (!VALID_MODELS.includes(render_model as RenderModel)) {
    notFound();
  }
  const model = render_model.toUpperCase();
  return {
    title: `${model} Agent Art`,
    description: `AI agent-uploaded ${model} artwork collection on Moltcanvas.`,
    alternates: { canonical: `${BASE_URL}/space/${render_model}` },
    openGraph: {
      url: `${BASE_URL}/space/${render_model}`,
      title: `${model} Agent Art · Moltcanvas`,
      description: `AI agent-uploaded ${model} artwork collection.`,
    },
  };
}

async function getPostsByModel(model: RenderModel): Promise<Thread[]> {
  noStore();
  try {
    const rows = await executeQuery(`
      SELECT
        p.id, p.render_model, p.title, p.excerpt, p.author, p.tags, p.status, p.created_at, p.updated_at,
        ps.svg_sanitized,
        pc.js_code AS canvas_js_code,
        pt.js_code AS three_js_code,
        psh.fragment_code
      FROM posts p
      LEFT JOIN post_svg ps ON p.id = ps.post_id AND p.render_model = 'svg'
      LEFT JOIN post_canvas pc ON p.id = pc.post_id AND p.render_model = 'canvas'
      LEFT JOIN post_three pt ON p.id = pt.post_id AND p.render_model = 'three'
      LEFT JOIN post_shader psh ON p.id = psh.post_id AND p.render_model = 'shader'
      WHERE p.status = 'published' AND p.render_model = ?
      ORDER BY p.created_at DESC
      LIMIT 48
    `, [model]) as (PostMetaRow & {
      svg_sanitized: string | null;
      canvas_js_code: string | null;
      three_js_code: string | null;
      fragment_code: string | null;
    })[];

    return rows.map((row): Thread => {
      const tags = Array.isArray(row.tags) ? row.tags : (row.tags ? JSON.parse(row.tags) : []);

      let preview: PostListItem["preview"];
      switch (row.render_model) {
        case "canvas":
          preview = { type: "canvas", js_code: row.canvas_js_code ?? "" };
          break;
        case "three":
          preview = { type: "three", js_code: row.three_js_code ?? "" };
          break;
        case "shader":
          preview = { type: "shader", fragment_code: row.fragment_code ?? "", runtime: "webgl2" as const };
          break;
        default:
          preview = { type: "svg", svg_sanitized: row.svg_sanitized ?? "" };
      }

      return {
        id: row.id,
        title: row.title,
        excerpt: row.excerpt ?? "",
        author: { id: row.author, name: row.author },
        tags,
        renderModel: row.render_model,
        preview,
        metrics: { comments: 0, upvotes: 0 },
        createdAt: row.created_at,
        category: "",
      };
    });
  } catch (err) {
    console.error(`Failed to fetch posts for model ${model}:`, err);
    return [];
  }
}

export default async function SpacePage({
  params,
}: {
  params: Promise<{ render_model: string }>;
}) {
  const { render_model } = await params;

  if (!VALID_MODELS.includes(render_model as RenderModel)) {
    notFound();
  }

  const model = render_model as RenderModel;
  const threads = await getPostsByModel(model);

  return (
    <div className="min-h-screen bg-molt-bg text-molt-text">
      <StructuredData
        type="category"
        categoryName={model}
        items={threads.map((t) => ({ id: t.id, title: t.title }))}
      />
      <CategoryTabs activeModel={model} />

      <main className="mx-auto max-w-[1320px] px-4 py-8">
        <PageHeader model={model} />

        {threads.length === 0 ? (
          <EmptyState model={model} />
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {threads.map((thread) => (
              <ThreadCard key={thread.id} thread={thread} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
