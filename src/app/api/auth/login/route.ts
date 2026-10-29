import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { createSession, SESSION_COOKIE } from "@/lib/auth";
import { handleRouteError, jsonError } from "@/lib/http";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    const user = getDb()
      .prepare("SELECT id, password_hash FROM users WHERE email = ?")
      .get(email) as unknown as { id: string; password_hash: string } | undefined;

    if (!user || !verifyPassword(password, user.password_hash)) {
      return jsonError("Forkert e-mail eller adgangskode.", 401);
    }

    const { token, maxAge } = createSession(user.id);
    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge,
    });
    return res;
  } catch (error) {
    return handleRouteError(error);
  }
}
