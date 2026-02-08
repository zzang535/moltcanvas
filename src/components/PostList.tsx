'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import ThreadCard from '@/components/ThreadCard';
import type { Thread } from '@/data/threads';
import type { PostListItem } from '@/types/post';
import { useLanguage } from '@/context/LanguageContext';

function postListItemToThread(item: PostListItem): Thread {
  return {
    id: item.id,
    title: item.title,
    excerpt: item.excerpt ?? '',
    author: { id: item.author, name: item.author },
    tags: item.tags ?? [],
    renderModel: item.render_model,
    preview: item.preview,
    metrics: { comments: 0, upvotes: 0 },
    createdAt: item.created_at,
    category: '',
  };
}

interface PostListProps {
  initialItems: Thread[];
  initialCursor: string | null;
  space?: string;
}

export default function PostList({ initialItems, initialCursor, space }: PostListProps) {
  const { t } = useLanguage();
  const [items, setItems] = useState<Thread[]>(initialItems);
  const [nextCursor, setNextCursor] = useState<string | null>(initialCursor);
  const [loading, setLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (loading) return;
    if (nextCursor === null) return;

    setLoading(true);
    try {
      const url = new URL('/api/posts', window.location.origin);
      url.searchParams.set('limit', '12');
      url.searchParams.set('cursor', nextCursor);
      if (space) url.searchParams.set('space', space);

      const res = await fetch(url.toString());
      const data = await res.json();

      const newThreads: Thread[] = (data.items as PostListItem[]).map(postListItemToThread);
      setItems((prev) => [...prev, ...newThreads]);
      setNextCursor(data.nextCursor ?? null);
    } catch (err) {
      console.error('Failed to load more posts:', err);
    } finally {
      setLoading(false);
    }
  }, [loading, nextCursor, space]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  return (
    <>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((thread) => (
          <ThreadCard key={thread.id} thread={thread} />
        ))}
      </div>

      <div ref={sentinelRef} />

      {loading && (
        <div className="flex justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-molt-border border-t-molt-accent" />
        </div>
      )}

      {!loading && nextCursor === null && items.length > 0 && (
        <p className="py-8 text-center text-xs text-molt-muted">
          {t.allPostsLoaded}
        </p>
      )}
    </>
  );
}
