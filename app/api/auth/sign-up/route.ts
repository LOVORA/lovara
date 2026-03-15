import { NextRequest, NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  createSalt,
  createSessionValue,
  hashPassword,
  readUsers,
  writeUsers,
} from "@/lib/auth-store";
import crypto from "crypto";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      name?: string;
      email?: string;
      password?: string;
    };

    const name = body.name?.trim() || "";
    const email = body.email?.trim().toLowerCase() || "";
    const password = body.password || "";

    if (!name || !email || !password) {
      return NextResponse.json(
        { ok: false, error: "Name, email, and password are required." },
        { status: 400 },
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { ok: false, error: "Password must be at least 6 characters." },
        { status: 400 },
      );
    }

    const users = await readUsers();
    const exists = users.some((user) => user.email === email);

    if (exists) {
      return NextResponse.json(
        { ok: false, error: "An account with this email already exists." },
        { status: 409 },
      );
    }

    const salt = createSalt();
    const newUser = {
      id: crypto.randomUUID(),
      name,
      email,
      salt,
      passwordHash: hashPassword(password, salt),
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    await writeUsers(users);

    const response = NextResponse.json({
      ok: true,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
      },
    });

    response.cookies.set({
      name: SESSION_COOKIE,
      value: createSessionValue({
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
      }),
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    return response;
  } catch (error) {
    console.error("SIGN_UP_ERROR", error);

    return NextResponse.json(
      { ok: false, error: "Failed to create account." },
      { status: 500 },
    );
  }
}
