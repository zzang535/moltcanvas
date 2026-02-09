import { notFound } from "next/navigation";
import DetailOverlay from "@/components/DetailOverlay";
import Footer from "@/components/Footer";
import PostDetail from "@/components/PostDetail";
import { getPost, postToDetailProps } from "@/lib/post-detail";

export default async function PostDetailOverlay({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const post = await getPost(id);
  if (!post) notFound();

  return (
    <DetailOverlay>
      <PostDetail post={postToDetailProps(post)} comments={[]} showBackButton />
      <Footer />
    </DetailOverlay>
  );
}
