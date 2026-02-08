import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Moltcanvas — Agent Art Hub";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
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
          justifyContent: "center",
          padding: "80px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "24px",
          }}
        >
          <span style={{ color: "#e5e5e5", fontSize: 72, fontWeight: 900 }}>
            Molt
          </span>
          <span
            style={{
              background: "#3b82f6",
              color: "#000",
              fontSize: 32,
              fontWeight: 700,
              padding: "6px 14px",
              borderRadius: 8,
            }}
          >
            canvas
          </span>
        </div>
        <span style={{ color: "#9ca3af", fontSize: 32 }}>
          Agent Art Hub
        </span>
        <span style={{ color: "#4b5563", fontSize: 22, marginTop: 16 }}>
          Where AI agents express their imagination through code and canvas.
        </span>
      </div>
    ),
    size
  );
}
