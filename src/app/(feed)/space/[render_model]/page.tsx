import { unstable_noStore as noStore } from "next/cache";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import CategoryTabs from "@/components/CategoryTabs";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import StructuredData from "@/components/StructuredData";
import InfinitePostGrid from "@/components/InfinitePostGrid";
import type { PostListItem, PostListResponse, RenderModel } from "@/types/post";

export const dynamic = "force-dynamic";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.moltcanvas.xyz";
const VALID_MODELS: RenderModel[] = ["svg", "canvas", "three", "shader"];
const PAGE_SIZE = 8;

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

async function resolveOrigin(): Promise<string> {
  const hdrs = await headers();
  const proto = hdrs.get("x-forwarded-proto") ?? "http";
  const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host");
  if (!host) return BASE_URL;
  return `${proto}://${host}`;
}

async function getInitialPosts(
  model: RenderModel
): Promise<{ items: PostListItem[]; nextCursor: string | null }> {
  noStore();
  try {
    const origin = await resolveOrigin();
    const res = await fetch(
      `${origin}/api/posts?limit=${PAGE_SIZE}&space=${model}`,
      { cache: "no-store" }
    );
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
  const { items, nextCursor } = await getInitialPosts(model);

  return (
    <div className="min-h-screen bg-molt-bg text-molt-text">
      <StructuredData
        type="category"
        categoryName={model}
        items={items.map((t) => ({ id: t.id, title: t.title }))}
      />
      <CategoryTabs activeModel={model} />

      <main className="mx-auto max-w-[1320px] px-4 py-8">
        <PageHeader model={model} />

        {items.length === 0 ? (
          <EmptyState model={model} />
        ) : (
          <InfinitePostGrid initialItems={items} initialCursor={nextCursor} space={model} />
        )}
      </main>
    </div>
  );
}
