import TopNav from "@/components/TopNav";
import CategoryTabs from "@/components/CategoryTabs";
import SectionHeader from "@/components/SectionHeader";
import ThreadCard from "@/components/ThreadCard";
import { executeQuery } from "@/lib/db";
import type { PostRow } from "@/types/post";
import type { Thread } from "@/data/threads";

async function getPosts(): Promise<Thread[]> {
  try {
    const rows = await executeQuery(
      `SELECT id, title, excerpt, author, tags, svg_sanitized AS svgThumb, created_at
       FROM posts ORDER BY created_at DESC LIMIT 48`
    ) as PostRow[];

    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      excerpt: row.excerpt ?? "",
      author: { id: row.author, name: row.author },
      tags: Array.isArray(row.tags) ? row.tags : (row.tags ? JSON.parse(row.tags) : []),
      svgThumb: (row as unknown as { svgThumb: string }).svgThumb ?? "",
      metrics: { comments: 0, upvotes: 0 },
      createdAt: new Date(row.created_at).toLocaleString("ko-KR", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      category: "",
    }));
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
              stroke="#F59E0B"
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
