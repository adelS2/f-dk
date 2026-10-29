import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { transitionOrder } from "@/lib/orders";
import { canViewOrder, getOrderWithItems } from "@/lib/queries";
import { handleRouteError, jsonError } from "@/lib/http";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Ikke logget ind", 401);
  const { id } = await params;
  const order = getOrderWithItems(id);
  if (!order || !canViewOrder(user, order)) return jsonError("Bestillingen findes ikke.", 404);
  return NextResponse.json({ order });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError("Ikke logget ind", 401);
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const result = transitionOrder(user, id, String(body.action ?? ""));
    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
