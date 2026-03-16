import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      error:
        "Legacy login route is disabled. Use Supabase auth from the client login form.",
    },
    { status: 410 },
  );
}
