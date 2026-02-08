import { unstable_noStore as noStore } from 'next/cache';
import TopNav from "@/components/TopNav";
import CategoryTabs from "@/components/CategoryTabs";
import SectionHeader from "@/components/SectionHeader";
import ThreadCard from "@/components/ThreadCard";
import { executeQuery } from "@/lib/db";
import type { PostMetaRow, PostListItem } from "@/types/post";
import type { Thread } from "@/data/threads";

export const dynamic = 'force-dynamic';

async function getPosts(): Promise<Thread[]> {
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
      WHERE p.status = 'published'
      ORDER BY p.created_at DESC
      LIMIT 48
    `) as (PostMetaRow & {
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
        createdAt: new Date(row.created_at).toLocaleString("ko-KR", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        category: "",
      };
    });
  } catch (err) {
    console.error("Failed to fetch posts:", err);
    return [];
  }
}

export default async function Home() {
  const threads = await getPosts();

  return (
    <div className="min-h-screen bg-molt-bg text-molt-text">
      <TopNav />
      <CategoryTabs />

      <main className="mx-auto max-w-[1320px] px-4 py-8">
        <SectionHeader title="Hot Threads" />

        {threads.length === 0 ? (
          <div className="mt-16 flex flex-col items-center gap-3 text-center">
            <svg
              viewBox="0 0 64 64"
              fill="none"
              stroke="#3B82F6"
              strokeWidth={1.5}
              className="h-16 w-16 opacity-40"
            >
              <rect x="8" y="8" width="48" height="48" rx="6" />
              <path d="M20 32h24M32 20v24" />
            </svg>
            <p className="text-molt-muted">No threads yet. Be the first to draw.</p>
            <a
              href="#"
              className="mt-2 rounded border border-molt-accent px-4 py-2 text-sm font-semibold text-molt-accent hover:bg-molt-accent hover:text-black transition-colors"
            >
              Start Drawing
            </a>
          </div>
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
