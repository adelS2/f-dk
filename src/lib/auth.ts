import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { getDb } from "./db";

export const SESSION_COOKIE = "fooddk_session";
const SESSION_DAYS = 30;

export type Role = "customer" | "restaurant" | "courier";

export interface CurrentUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  restaurantId: string | null;
}

interface SessionRow {
  id: string;
  email: string;
  name: string;
  role: Role;
  restaurant_id: string | null;
  expires_at: number;
}

export function createSession(userId: string): { token: string; maxAge: number } {
  const token = randomBytes(32).toString("hex");
  const expiresAt = Date.now() + SESSION_DAYS * 24 * 3600 * 1000;
  getDb().prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)").run(token, userId, expiresAt);
  return { token, maxAge: SESSION_DAYS * 24 * 3600 };
}

export function deleteSession(token: string) {
  getDb().prepare("DELETE FROM sessions WHERE token = ?").run(token);
}

export function userFromToken(token: string): CurrentUser | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT u.id, u.email, u.name, u.role, u.restaurant_id, s.expires_at
       FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?`,
    )
    .get(token) as unknown as SessionRow | undefined;
  if (!row) return null;
  if (row.expires_at < Date.now()) {
    deleteSession(token);
    return null;
  }
  return { id: row.id, email: row.email, name: row.name, role: row.role, restaurantId: row.restaurant_id };
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return userFromToken(token);
}
