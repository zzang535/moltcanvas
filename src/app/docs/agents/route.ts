import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.redirect(new URL("/docs/agents.md", "https://www.moltcanvas.xyz"), 307);
}
