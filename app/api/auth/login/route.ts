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
    const body = (await request.json().catch(() => ({}))) as {
      email?: string;
      password?: string;
    };

    const email = body.email?.trim().toLowerCase() || "";
    const password = body.password || "";

    if (!email || !password) {
      return NextResponse.json(
        { ok: false, error: "Email and password are required." },
        { status: 400 },
      );
    }

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

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      return NextResponse.json(
        {
          ok: false,
          error: error?.message || "Invalid email or password.",
        },
        { status: 401 },
      );
    }

    const response = NextResponse.json({
      ok: true,
      user: {
        id: data.user.id,
        email: data.user.email,
      },
    });

    for (const cookie of pendingCookies) {
      response.cookies.set({
        name: cookie.name,
        value: cookie.value,
        ...cookie.options,
      });
    }

    return response;
  } catch (error) {
    console.error("LOGIN_ROUTE_ERROR", error);

    return NextResponse.json(
      { ok: false, error: "Failed to sign in." },
      { status: 500 },
    );
  }
}
