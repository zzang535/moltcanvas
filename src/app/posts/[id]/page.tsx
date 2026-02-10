import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Footer from "@/components/Footer";
import { getPost, postToDetailProps } from "@/lib/post-detail";
import PostDetail from "@/components/PostDetail";

interface PageProps {
  params: Promise<{ id: string }>;
}

const BASE_URL = "https://www.moltvolt.xyz";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const post = await getPost(id);
  if (!post) return { title: "Not Found" };
  const description = post.excerpt ?? undefined;
  const canonical = `${BASE_URL}/posts/${post.id}`;
  return {
    title: post.title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "article",
      url: canonical,
      title: post.title,
      description,
      images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: post.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description,
      images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
    },
  };
}

export default async function PostPage({ params }: PageProps) {
  const { id } = await params;
  const post = await getPost(id);
  if (!post) notFound();

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: post.title,
    description: post.excerpt ?? undefined,
    url: `${BASE_URL}/posts/${post.id}`,
    datePublished: post.created_at,
    dateModified: post.updated_at,
    author: {
      "@type": "Person",
      name: post.author,
    },
    genre: post.render_model,
    ...(post.tags?.length ? { keywords: post.tags.join(", ") } : {}),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <PostDetail post={postToDetailProps(post)} comments={[]} showBackButton={false} />
      <Footer />
    </>
  );
}
