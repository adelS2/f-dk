import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getDb } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { createSession, SESSION_COOKIE } from "@/lib/auth";
import { handleRouteError, jsonError } from "@/lib/http";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const name = String(body.name ?? "").trim();
    const phone = String(body.phone ?? "").trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return jsonError("Ugyldig e-mailadresse.", 400);
    if (password.length < 8) return jsonError("Adgangskoden skal være mindst 8 tegn.", 400);
    if (!name) return jsonError("Navn er påkrævet.", 400);

    const db = getDb();
    const exists = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
    if (exists) return jsonError("Der findes allerede en konto med denne e-mail.", 409);

    const userId = randomUUID();
    // Public sign-up only creates customers. Restaurants and couriers are onboarded by the platform.
    db.prepare(`INSERT INTO users (id, email, name, phone, password_hash, role, restaurant_id, created_at)
                VALUES (?, ?, ?, ?, ?, 'customer', NULL, ?)`)
      .run(userId, email, name, phone, hashPassword(password), new Date().toISOString());

    const { token, maxAge } = createSession(userId);
    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge,
    });
    return res;
  } catch (error) {
    return handleRouteError(error);
  }
}
