import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export const runtime = "nodejs";

type PendingCookie = {
  name: string;
  value: string;
  options: CookieOptions;
};

export async function POST(request: NextRequest) {
  try {
    const pendingCookies: PendingCookie[] = [];

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            pendingCookies.push({ name, value, options });
          },
          remove(name: string, options: CookieOptions) {
            pendingCookies.push({ name, value: "", options });
          },
        },
      },
    );

    await supabase.auth.signOut();

    const response = NextResponse.json({ ok: true });

    for (const cookie of pendingCookies) {
      response.cookies.set({
        name: cookie.name,
        value: cookie.value,
        ...cookie.options,
      });
    }

    return response;
  } catch (error) {
    console.error("LOGOUT_ROUTE_ERROR", error);

    return NextResponse.json(
      { ok: false, error: "Failed to sign out." },
      { status: 500 },
    );
  }
}
