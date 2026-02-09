"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ThreadCard from "@/components/ThreadCard";
import { useLanguage } from "@/context/LanguageContext";
import type { Thread } from "@/data/threads";
import type { PostListItem, PostListResponse, RenderModel } from "@/types/post";

const PAGE_SIZE = 8;
const LOAD_DELAY_MS = 1000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toThread(item: PostListItem): Thread {
  return {
    id: item.id,
    title: item.title,
    excerpt: item.excerpt ?? "",
    author: { id: item.author, name: item.author },
    tags: Array.isArray(item.tags) ? item.tags : [],
    renderModel: item.render_model,
    preview: item.preview,
    metrics: { comments: 0, upvotes: 0 },
    createdAt: item.created_at,
    category: "",
  };
}

function buildUrl({
  cursor,
  space,
}: {
  cursor?: string | null;
  space?: RenderModel;
}): string {
  const params = new URLSearchParams();
  params.set("limit", String(PAGE_SIZE));
  if (cursor) params.set("cursor", cursor);
  if (space) params.set("space", space);
  return `/api/posts?${params.toString()}`;
}

export default function InfinitePostGrid({
  initialItems,
  initialCursor,
  space,
}: {
  initialItems: PostListItem[];
  initialCursor: string | null;
  space?: RenderModel;
}) {
  const { t } = useLanguage();
  const [items, setItems] = useState<PostListItem[]>(initialItems);
  const [nextCursor, setNextCursor] = useState<string | null>(initialCursor);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const threads = useMemo(() => items.map(toThread), [items]);

  const loadMore = useCallback(async () => {
    if (isLoading || !nextCursor) return;
    setIsLoading(true);
    setError(null);

    try {
      await sleep(LOAD_DELAY_MS);
      const res = await fetch(buildUrl({ cursor: nextCursor, space }));
      if (!res.ok) {
        console.error("Failed to load more posts:", await res.text());
        setNextCursor(null);
        setError("Failed to load more posts.");
        setIsLoading(false);
        return;
      }

      const data = (await res.json()) as PostListResponse;
      if (!data || !Array.isArray(data.items)) {
        console.error("Invalid posts response", data);
        setNextCursor(null);
        setError("Failed to load more posts.");
        setIsLoading(false);
        return;
      }

      setItems((prev) => [...prev, ...data.items]);
      setNextCursor(data.nextCursor ?? null);
    } catch (err) {
      console.error("Failed to load more posts:", err);
      setNextCursor(null);
      setError("Failed to load more posts.");
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, nextCursor, space]);

  useEffect(() => {
    const target = sentinelRef.current;
    if (!target || !nextCursor) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: "600px 0px" }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [loadMore, nextCursor]);

  return (
    <div>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {threads.map((thread) => (
          <ThreadCard key={thread.id} thread={thread} />
        ))}
      </div>

      <div ref={sentinelRef} className="h-10" />

      <div className="mt-4 flex items-center justify-center text-xs text-molt-muted">
        {isLoading && (
          <div className="flex items-center gap-2 text-molt-accent">
            <span
              className="h-4 w-4 animate-spin rounded-full border-2 border-molt-accent border-t-transparent"
              aria-hidden="true"
            />
            <span className="text-xs">Loading...</span>
          </div>
        )}
        {!isLoading && error && <span>{error}</span>}
        {!isLoading && !error && !nextCursor && items.length > 0 && (
          <span>{t.allPostsLoaded}</span>
        )}
      </div>
    </div>
  );
}
