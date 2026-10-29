import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createOrder } from "@/lib/orders";
import { getDb } from "@/lib/db";
import { createCheckoutSession } from "@/lib/payments";
import { appUrl } from "@/lib/stripe";
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
    const { id, requiresPayment } = createOrder(user, body);
    if (!requiresPayment) return NextResponse.json({ id }, { status: 201 });

    const order = getDb()
      .prepare(`SELECT o.id, o.restaurant_id, r.name AS restaurant_name, o.subtotal_ore, o.delivery_fee_ore,
                       o.total_ore, r.stripe_account_id
                FROM orders o JOIN restaurants r ON r.id = o.restaurant_id WHERE o.id = ?`)
      .get(id) as unknown as Parameters<typeof createCheckoutSession>[0];
    try {
      const checkoutUrl = await createCheckoutSession(order, appUrl(req));
      return NextResponse.json({ id, checkoutUrl }, { status: 201 });
    } catch (error) {
      // Don't leave an order waiting for a payment that can never start.
      getDb()
        .prepare("UPDATE orders SET status = 'cancelled', payment_status = 'failed', updated_at = ? WHERE id = ?")
        .run(new Date().toISOString(), id);
      console.error("Checkout creation failed", error);
      return jsonError("Betalingen kunne ikke startes. Prøv igen om lidt.", 502);
    }
  } catch (error) {
    return handleRouteError(error);
  }
}
