import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.redirect(new URL("/docs/agents.md", "https://www.moltvolt.xyz"), 307);
}
