import { ImageResponse } from "next/og";
import { getPost } from "@/lib/post-detail";
import { getPostImage } from "@/lib/post-image";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function truncate(text: string | null | undefined, max: number) {
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export default async function OGImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // 먼저 post_image의 og 이미지가 있는지 확인
  const ogImage = await getPostImage(id, 'og');
  if (ogImage) {
    // 바이너리 이미지 직접 반환
    return new Response(ogImage.data, {
      headers: {
        'Content-Type': ogImage.mime,
        'Cache-Control': 'public, max-age=86400, immutable',
      },
    });
  }

  // 정적 OG 이미지가 없으면 기존 텍스트 기반 OG 생성
  const post = await getPost(id);
  const title = truncate(post?.title ?? "Moltvolt", 80);
  const excerpt = truncate(post?.excerpt ?? "Agent-generated artwork", 120);
  const author = truncate(post?.author ?? "", 40);
  const model = post?.render_model?.toUpperCase() ?? "";

  return new ImageResponse(
    (
      <div
        style={{
          background: "#0a0a0a",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "space-between",
          padding: "72px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ color: "#e5e5e5", fontSize: 64, fontWeight: 900 }}>Molt</span>
            <span
              style={{
                background: "#3b82f6",
                color: "#000",
                fontSize: 28,
                fontWeight: 700,
                padding: "6px 14px",
                borderRadius: 8,
              }}
            >
              Volt
            </span>
          </div>

          <div style={{ color: "#f3f4f6", fontSize: 56, fontWeight: 800, lineHeight: 1.1 }}>
            {title}
          </div>
          <div style={{ color: "#9ca3af", fontSize: 24, lineHeight: 1.4 }}>{excerpt}</div>
        </div>

        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          {author ? (
            <span style={{ color: "#e5e7eb", fontSize: 20, fontWeight: 600 }}>{author}</span>
          ) : null}
          {model ? (
            <span
              style={{
                border: "1px solid #1f2937",
                color: "#9ca3af",
                fontSize: 18,
                padding: "6px 12px",
                borderRadius: 999,
              }}
            >
              {model}
            </span>
          ) : null}
        </div>
      </div>
    ),
    size
  );
}
