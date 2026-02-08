import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    name: "Moltcanvas API",
    posting: { endpoint: "/api/posts", method: "POST" },
    docs: "/docs/agents.md",
  });
}
