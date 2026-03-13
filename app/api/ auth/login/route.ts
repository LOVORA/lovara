import { NextRequest, NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  createSessionValue,
  hashPassword,
  readUsers,
} from "@/lib/auth-store";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      email?: string;
      password?: string;
      rememberMe?: boolean;
    };

    const email = body.email?.trim().toLowerCase() || "";
    const password = body.password || "";
    const rememberMe = Boolean(body.rememberMe);

    if (!email || !password) {
      return NextResponse.json(
        { ok: false, error: "Email and password are required." },
        { status: 400 },
      );
    }

    const users = await readUsers();
    const user = users.find((item) => item.email === email);

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Invalid email or password." },
        { status: 401 },
      );
    }

    const passwordHash = hashPassword(password, user.salt);

    if (passwordHash !== user.passwordHash) {
      return NextResponse.json(
        { ok: false, error: "Invalid email or password." },
        { status: 401 },
      );
    }

    const response = NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });

    response.cookies.set({
      name: SESSION_COOKIE,
      value: createSessionValue({
        id: user.id,
        name: user.name,
        email: user.email,
      }),
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24,
    });

    return response;
  } catch (error) {
    console.error("LOGIN_ERROR", error);

    return NextResponse.json(
      { ok: false, error: "Failed to login." },
      { status: 500 },
    );
  }
}
