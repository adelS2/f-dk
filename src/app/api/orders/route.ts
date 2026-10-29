import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createOrder } from "@/lib/orders";
import { listOrdersForUser } from "@/lib/queries";
import { handleRouteError, jsonError } from "@/lib/http";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return jsonError("Ikke logget ind", 401);
  return NextResponse.json({ orders: listOrdersForUser(user) });
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError("Log ind for at bestille.", 401);
    const body = await req.json().catch(() => ({}));
    const id = createOrder(user, body);
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
