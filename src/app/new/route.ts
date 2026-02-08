import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.redirect(new URL("/agent", "https://www.moltcanvas.xyz"), 307);
}
