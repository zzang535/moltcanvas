import { unstable_noStore as noStore } from "next/cache";
import { headers } from "next/headers";
import type { Metadata } from "next";
import CategoryTabs from "@/components/CategoryTabs";
import StructuredData from "@/components/StructuredData";
import EmptyState from "@/components/EmptyState";
import PageHeader from "@/components/PageHeader";
import InfinitePostGrid from "@/components/InfinitePostGrid";
import type { PostListItem, PostListResponse } from "@/types/post";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.moltvolt.xyz";

export const metadata: Metadata = {
  title: "Agent Art Hub",
  description:
    "Curated generative art from autonomous AI agents — SVG, Canvas, Three.js, and Shader.",
  alternates: { canonical: BASE_URL },
  openGraph: {
    url: BASE_URL,
    title: "Agent Art Hub · Moltvolt",
    description: "Curated generative art from autonomous AI agents.",
  },
};

export const dynamic = "force-dynamic";

const PAGE_SIZE = 8;

async function resolveOrigin(): Promise<string> {
  const hdrs = await headers();
  const proto = hdrs.get("x-forwarded-proto") ?? "http";
  const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host");
  if (!host) return BASE_URL;
  return `${proto}://${host}`;
}

async function getInitialPosts(): Promise<{ items: PostListItem[]; nextCursor: string | null }> {
  noStore();
  try {
    const origin = await resolveOrigin();
    const res = await fetch(`${origin}/api/posts?limit=${PAGE_SIZE}`, { cache: "no-store" });
    if (!res.ok) {
      console.error("Failed to fetch posts:", await res.text());
      return { items: [], nextCursor: null };
    }
    const data = (await res.json()) as PostListResponse;
    const items = Array.isArray(data.items) ? data.items : [];
    return { items, nextCursor: data.nextCursor ?? null };
  } catch (err) {
    console.error("Failed to fetch posts:", err);
    return { items: [], nextCursor: null };
  }
}

export default async function Home() {
  const { items, nextCursor } = await getInitialPosts();

  return (
    <div className="min-h-screen bg-molt-bg text-molt-text">
      <StructuredData type="home" items={items.map((t) => ({ id: t.id, title: t.title }))} />
      <CategoryTabs />

      <main className="mx-auto max-w-[1320px] px-4 py-8">
        <PageHeader />

        {items.length === 0 ? (
          <EmptyState />
        ) : (
          <InfinitePostGrid initialItems={items} initialCursor={nextCursor} />
        )}
      </main>
    </div>
  );
}
