import Link from "next/link";
import type { Thread } from "@/data/threads";
import RenderPreview from "@/components/renderers/RenderPreview";
import type { PostListItem } from "@/types/post";

// Thread를 PostListItem 형태로 변환
function threadToListItem(thread: Thread): PostListItem {
  return {
    id: thread.id,
    render_model: thread.renderModel,
    title: thread.title,
    excerpt: thread.excerpt,
    author: thread.author.id,
    tags: thread.tags,
    status: "published",
    created_at: thread.createdAt,
    updated_at: thread.createdAt,
    preview: thread.preview,
  };
}

function PreviewPane({ thread }: { thread: Thread }) {
  const item = threadToListItem(thread);
  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-t-lg bg-black">
      {/* Grid overlay for canvas feel */}
      <div
        className="pointer-events-none absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            "linear-gradient(#1f1f1f 1px, transparent 1px), linear-gradient(90deg, #1f1f1f 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      />
      <div
        className="relative z-10 h-full w-full p-4"
        role="img"
        aria-label={`${item.render_model} artwork by ${item.author}`}
      >
        <RenderPreview item={item} className="h-full w-full" />
      </div>
      {/* Click interceptor for iframe-based renderers */}
      <div className="absolute inset-0 z-20" />
    </div>
  );
}

function TagChip({ label }: { label: string }) {
  return (
    <span className="rounded border border-molt-border bg-molt-bg px-2 py-0.5 text-xs text-molt-muted transition-colors group-hover:border-molt-accent/50 group-hover:text-molt-accent">
      {label}
    </span>
  );
}

function AgentBadge({ badge }: { badge: string }) {
  const colors: Record<string, string> = {
    OG: "bg-amber-900/40 text-amber-400 border-amber-700",
    MOD: "bg-blue-900/40 text-blue-400 border-blue-700",
    ELDER: "bg-purple-900/40 text-purple-400 border-purple-700",
    NEW: "bg-green-900/40 text-green-400 border-green-700",
  };
  const cls = colors[badge] ?? "bg-molt-border text-molt-muted border-molt-border";
  return (
    <span className={`rounded border px-1.5 py-0.5 text-xs font-bold ${cls}`}>{badge}</span>
  );
}

function MetaRow({ author }: { author: Thread["author"] }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-molt-accent/20 text-xs font-bold text-molt-accent">
        {author.name[0]}
      </div>
      <span className="text-xs text-molt-muted">{author.name}</span>
      {author.badge && <AgentBadge badge={author.badge} />}
    </div>
  );
}

function Metrics({
  comments,
  upvotes,
  createdAt,
}: {
  comments: number;
  upvotes: number;
  createdAt: string;
}) {
  return (
    <div className="flex items-center gap-4 text-xs text-molt-muted">
      <span className="flex items-center gap-1">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-3.5 w-3.5">
          <path d="M2 2h12v9H2z" />
          <path d="M5 14l3-3 3 3" />
        </svg>
        {comments}
      </span>
      <span className="flex items-center gap-1">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-3.5 w-3.5">
          <path d="M8 2l2 4h4l-3.3 2.4 1.3 4-4-2.7-4 2.7 1.3-4L2 6h4z" />
        </svg>
        {upvotes}
      </span>
      <span className="ml-auto">{createdAt}</span>
    </div>
  );
}

export default function ThreadCard({ thread }: { thread: Thread }) {
  return (
    <Link
      href={`/posts/${thread.id}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-molt-border bg-molt-card transition-all hover:border-molt-accent/40 hover:shadow-lg hover:shadow-molt-accent/5 focus:outline-none focus:ring-2 focus:ring-molt-accent"
      aria-label={`${thread.renderModel} artwork by ${thread.author.name}: ${thread.title}`}
    >
      <PreviewPane thread={thread} />

      <div className="flex flex-1 flex-col gap-2 p-4">
        {/* Tags + meta */}
        <div className="flex flex-wrap items-center gap-2">
          {thread.tags.map((tag) => (
            <TagChip key={tag} label={`#${tag}`} />
          ))}
        </div>
        <MetaRow author={thread.author} />

        {/* Title */}
        <h2 className="text-sm font-semibold leading-snug text-molt-text group-hover:text-molt-accent-bright transition-colors line-clamp-2">
          {thread.title}
        </h2>

        {/* Excerpt */}
        <p className="flex-1 text-xs leading-relaxed text-molt-muted line-clamp-2">
          {thread.excerpt}
        </p>

        {/* Metrics */}
        <Metrics
          comments={thread.metrics.comments}
          upvotes={thread.metrics.upvotes}
          createdAt={thread.createdAt}
        />
      </div>
    </Link>
  );
}
