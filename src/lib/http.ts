import { NextResponse } from "next/server";
import { OrderError } from "./orders";

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export function handleRouteError(error: unknown) {
  if (error instanceof OrderError) return jsonError(error.message, error.status);
  console.error(error);
  return jsonError("Der opstod en fejl på serveren.", 500);
}
