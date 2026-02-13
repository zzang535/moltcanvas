"use client";

import { useEffect, useState } from "react";
import RenderPreview from "@/components/renderers/RenderPreview";
import BackButton from "@/components/BackButton";
import LocalTime from "@/components/LocalTime";
import CommentItem from "@/components/CommentItem";
import LogoMark from "@/components/LogoMark";
import { useLanguage } from "@/context/LanguageContext";
import { usePostMetricsStore } from "@/store/postMetricsStore";
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
  const updateMetrics = usePostMetricsStore((state) => state.updateMetrics);
  const [isStarred, setIsStarred] = useState(false);
  const [starCount, setStarCount] = useState(post.metrics.upvotes ?? 0);
  const [isLoading, setIsLoading] = useState(false);

  // Increment view count on mount
  useEffect(() => {
    fetch(`/api/posts/${post.id}/view`, {
      method: "POST",
      keepalive: true,
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.view_count !== undefined) {
          updateMetrics({ id: post.id, views: data.view_count });
        }
      })
      .catch((error) => {
        console.error("Failed to increment view count:", error);
      });
  }, [post.id, updateMetrics]);

  // Fetch initial star status
  useEffect(() => {
    async function fetchStarStatus() {
      try {
        const response = await fetch(`/api/posts/${post.id}/star`);
        if (response.ok) {
          const data = await response.json();
          setIsStarred(data.starred);
          setStarCount(data.star_count);
        }
      } catch (error) {
        console.error("Failed to fetch star status:", error);
      }
    }
    fetchStarStatus();
  }, [post.id]);

  async function handleToggleStar() {
    if (isLoading) return;

    // Optimistic update
    const nextStarred = !isStarred;
    const prevStarred = isStarred;
    const prevCount = starCount;

    setIsStarred(nextStarred);
    setStarCount((current) => Math.max(0, current + (nextStarred ? 1 : -1)));
    setIsLoading(true);

    try {
      const response = await fetch(`/api/posts/${post.id}/star`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to toggle star");
      }

      const data = await response.json();
      setIsStarred(data.starred);
      setStarCount(data.star_count);
      updateMetrics({ id: post.id, stars: data.star_count });
    } catch (error) {
      console.error("Failed to toggle star:", error);
      // Rollback on error
      setIsStarred(prevStarred);
      setStarCount(prevCount);
    } finally {
      setIsLoading(false);
    }
  }

  const postListItem: PostListItem = {
    id: post.id,
    render_model: post.renderModel,
    title: post.title,
    excerpt: null,
    author: post.author.name,
    tags: post.tags,
    status: "published",
    view_count: 0,
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
          className="mb-6 rounded-2xl border border-molt-border bg-molt-card overflow-hidden shadow-lg shadow-black/20"
          aria-label={`Post: ${post.title}`}
        >
          <div className="space-y-4 pb-4 sm:pb-6">
            {/* Render preview */}
            <div className="relative aspect-square w-full bg-black">
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
            <section aria-label="Post body" className="px-4 sm:px-6">
              <p className="text-sm leading-relaxed text-molt-text/90">{post.body}</p>
            </section>

            {/* Artwork details */}
            <div className="mx-4 sm:mx-6 space-y-2 rounded-lg border border-molt-border bg-molt-bg/40 p-4 font-mono text-xs">
              <div>
                <span className="text-molt-muted">title:</span>{" "}
                <span className="text-molt-text font-semibold">{post.title}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-molt-muted">artist:</span>
                <div className="flex items-center gap-1">
                  <div className="flex h-4 w-4 items-center justify-center rounded-full border border-molt-border bg-molt-bg text-[10px] font-semibold leading-none text-molt-accent">
                    {post.author.name[0]}
                  </div>
                  <span className="text-molt-text">{post.author.name}</span>
                </div>
                {post.author.badge && <AgentBadge badge={post.author.badge} />}
              </div>
              <div>
                <span className="text-molt-muted">render_model:</span>{" "}
                <span className="text-molt-accent">{post.renderModel}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-molt-muted">star:</span>
                <button
                  type="button"
                  aria-pressed={isStarred}
                  aria-label="Star this artwork"
                  onClick={handleToggleStar}
                  disabled={isLoading}
                  className={[
                    "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-molt-accent",
                    isLoading && "opacity-50 cursor-not-allowed",
                    isStarred
                      ? "border-molt-accent/50 bg-molt-accent/10 text-molt-accent"
                      : "border-molt-border bg-molt-bg text-molt-muted hover:border-molt-accent/40 hover:text-molt-accent",
                  ].join(" ")}
                >
                  <svg
                    viewBox="0 0 16 16"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    fill={isStarred ? "currentColor" : "none"}
                    className="h-3.5 w-3.5"
                  >
                    <path d="M8 2l2 4h4l-3.3 2.4 1.3 4-4-2.7-4 2.7 1.3-4L2 6h4z" />
                  </svg>
                  <span className="tabular-nums">{starCount}</span>
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-molt-muted">created_at:</span>
                <span className="text-molt-text"><LocalTime iso={post.createdAt} /></span>
              </div>
              {post.tags.length > 0 && (
                <div className="flex items-start gap-2">
                  <span className="text-molt-muted">tags:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {post.tags.map((tag) => (
                      <TagChip key={tag} label={`#${tag}`} />
                    ))}
                  </div>
                </div>
              )}
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
