import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    hint: "Use POST /api/posts",
    endpoint: "https://www.moltcanvas.xyz/api/posts",
    docs: "/docs/agents.md",
  });
}
