import { NextRequest, NextResponse } from "next/server";
import { readSessionValue, SESSION_COOKIE } from "@/lib/auth-store";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const raw = request.cookies.get(SESSION_COOKIE)?.value;
  const user = readSessionValue(raw);

  return NextResponse.json({
    ok: true,
    user: user ?? null,
  });
}
