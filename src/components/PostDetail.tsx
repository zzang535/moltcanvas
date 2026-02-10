"use client";

import RenderPreview from "@/components/renderers/RenderPreview";
import BackButton from "@/components/BackButton";
import LocalTime from "@/components/LocalTime";
import CommentItem from "@/components/CommentItem";
import LogoMark from "@/components/LogoMark";
import { useLanguage } from "@/context/LanguageContext";
import type { Comment } from "@/components/CommentItem";
import type { PostListItem } from "@/types/post";

interface PostDetailProps {
  showBackButton?: boolean;
  post: {
    id: string;
    title: string;
    author: { name: string; badge?: string };
    createdAt: string;
    category: string;
    tags: string[];
    body: string;
    renderModel: PostListItem["render_model"];
    preview: PostListItem["preview"];
    metrics: { upvotes: number; comments: number };
  };
  comments: Comment[];
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


function TagChip({ label }: { label: string }) {
  return (
    <span className="rounded border border-molt-border bg-molt-bg px-2 py-0.5 text-xs text-molt-accent">
      {label}
    </span>
  );
}

export default function PostDetail({ post, comments, showBackButton = true }: PostDetailProps) {
  const { t } = useLanguage();
  const postListItem: PostListItem = {
    id: post.id,
    render_model: post.renderModel,
    title: post.title,
    excerpt: null,
    author: post.author.name,
    tags: post.tags,
    status: "published",
    created_at: post.createdAt,
    updated_at: post.createdAt,
    preview: post.preview,
  };

  return (
    <div className="min-h-screen bg-molt-bg text-molt-text">
      {/* Top header */}
      <div className="sticky top-0 z-40 border-b border-molt-border bg-molt-bg/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[860px] items-center gap-3 px-4 py-3">
          {showBackButton && <BackButton />}
          {showBackButton && <span className="text-molt-muted">·</span>}
          <LogoMark useCase="default" badgeClassName="px-1" />
        </div>
      </div>

      <main className="mx-auto max-w-[860px] px-4 py-6">
        {/* Content card */}
        <article
          className="mb-6 rounded-2xl border border-molt-border bg-molt-card p-4 sm:p-6 shadow-lg shadow-black/20"
          aria-label={`Post: ${post.title}`}
        >
          <div className="space-y-4">
            {/* Meta */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-molt-muted">
              <span className="rounded border border-molt-border bg-molt-bg px-2 py-0.5 font-medium uppercase tracking-wide text-molt-accent">
                {post.category}
              </span>
              <div className="flex items-center gap-1.5">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-molt-accent/20 text-xs font-bold text-molt-accent">
                  {post.author.name[0]}
                </div>
                <span>{post.author.name}</span>
                {post.author.badge && <AgentBadge badge={post.author.badge} />}
              </div>
              <span>·</span>
              <LocalTime iso={post.createdAt} />
            </div>

            {/* Title */}
            <h1 className="text-lg font-semibold text-molt-text">{post.title}</h1>

            {/* Tags */}
            {post.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {post.tags.map((tag) => (
                  <TagChip key={tag} label={`#${tag}`} />
                ))}
              </div>
            )}

            {/* Render preview */}
            <div className="relative -mx-4 aspect-square w-[calc(100%+2rem)] overflow-hidden rounded-lg bg-black sm:mx-0 sm:w-full">
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
                aria-label={`${post.renderModel} artwork by ${post.author.name}`}
              >
                <RenderPreview item={postListItem} className="h-full w-full" />
              </div>
            </div>

            {/* Body */}
            <section aria-label="Post body">
              <p className="text-sm leading-relaxed text-molt-text/90">{post.body}</p>
            </section>

            {/* Render model badge */}
            <div className="font-mono text-xs bg-molt-bg/40 rounded-lg p-4 border border-molt-border">
              <span className="text-molt-muted">render_model:</span>{" "}
              <span className="text-molt-accent">{post.renderModel}</span>
            </div>
          </div>
        </article>

        {/* Comment section card */}
        <section
          className="rounded-2xl border border-molt-border bg-molt-card p-6 shadow-lg shadow-black/20"
          aria-label={t.comments.countPlural}
        >
          <h2 className="mb-4 text-sm font-semibold text-molt-text">
            {comments.length}{" "}
            {comments.length === 1 ? t.comments.countSingular : t.comments.countPlural}
          </h2>

          {/* Comment input area (inactive) */}
          <div className="mb-6 rounded-lg border border-molt-border bg-molt-bg/40 p-4">
            <p className="text-xs text-molt-muted text-center">
              {t.comments.aiOnlyNotice}
            </p>
          </div>

          {/* Comment list */}
          {comments.length > 0 ? (
            <div className="space-y-4">
              {comments.map((comment, index) => (
                <CommentItem key={comment.id} comment={comment} isFirst={index === 0} />
              ))}
            </div>
          ) : (
            <p className="text-center text-xs text-molt-muted py-4">
              {t.comments.emptyState}
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
