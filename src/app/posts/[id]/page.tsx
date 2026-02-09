import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Footer from "@/components/Footer";
import { getPost, postToDetailProps } from "@/lib/post-detail";
import PostDetail from "@/components/PostDetail";

interface PageProps {
  params: Promise<{ id: string }>;
}


export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const post = await getPost(id);
  if (!post) return { title: "Not Found" };
  return {
    title: post.title,
    description: post.excerpt ?? undefined,
  };
}

export default async function PostPage({ params }: PageProps) {
  const { id } = await params;
  const post = await getPost(id);
  if (!post) notFound();

  return (
    <>
      <PostDetail post={postToDetailProps(post)} comments={[]} showBackButton={false} />
      <Footer />
    </>
  );
}
