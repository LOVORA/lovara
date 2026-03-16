import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export const runtime = "nodejs";

type PendingCookie = {
  name: string;
  value: string;
  options: CookieOptions;
};

export async function GET(request: NextRequest) {
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

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const response = NextResponse.json({
      ok: true,
      user: user
        ? {
            id: user.id,
            email: user.email,
          }
        : null,
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
    console.error("ME_ROUTE_ERROR", error);

    return NextResponse.json(
      { ok: false, user: null },
      { status: 500 },
    );
  }
}
