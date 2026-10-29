import type Stripe from "stripe";
import { getDb } from "./db";
import { getStripe, platformFeeBps } from "./stripe";

interface OrderForPayment {
  id: string;
  restaurant_id: string;
  restaurant_name: string;
  subtotal_ore: number;
  delivery_fee_ore: number;
  total_ore: number;
  stripe_account_id: string | null;
}

export async function createCheckoutSession(order: OrderForPayment, baseUrl: string): Promise<string> {
  const stripe = getStripe();
  if (!stripe) throw new Error("Stripe er ikke konfigureret.");

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
    {
      quantity: 1,
      price_data: {
        currency: "dkk",
        unit_amount: order.subtotal_ore,
        product_data: { name: `Mad fra ${order.restaurant_name}` },
      },
    },
    {
      quantity: 1,
      price_data: {
        currency: "dkk",
        unit_amount: order.delivery_fee_ore,
        product_data: { name: "Levering" },
      },
    },
  ];

  const paymentIntentData: Stripe.Checkout.SessionCreateParams.PaymentIntentData = {};
  if (order.stripe_account_id) {
    // Destination charge: the restaurant receives the sale minus the platform fee.
    paymentIntentData.application_fee_amount = Math.round((order.total_ore * platformFeeBps()) / 10000);
    paymentIntentData.transfer_data = { destination: order.stripe_account_id };
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    locale: "da",
    currency: "dkk",
    line_items: lineItems,
    payment_intent_data: paymentIntentData,
    success_url: `${baseUrl}/orders/${order.id}?paid=1`,
    cancel_url: `${baseUrl}/cart`,
    metadata: { orderId: order.id },
    client_reference_id: order.id,
  });

  getDb()
    .prepare("UPDATE orders SET stripe_session_id = ? WHERE id = ?")
    .run(session.id, order.id);

  if (!session.url) throw new Error("Stripe returnerede ingen betalingslink.");
  return session.url;
}

// Called from the verified webhook. Idempotent: only moves orders still waiting for payment.
export function markOrderPaid(orderId: string, paymentIntentId: string | null) {
  const now = new Date().toISOString();
  getDb()
    .prepare(`UPDATE orders SET status = 'placed', payment_status = 'paid', payment_intent_id = ?, updated_at = ?
              WHERE id = ? AND status = 'pending_payment'`)
    .run(paymentIntentId, now, orderId);
}

export function markCheckoutExpired(orderId: string) {
  const now = new Date().toISOString();
  getDb()
    .prepare(`UPDATE orders SET status = 'cancelled', payment_status = 'expired', updated_at = ?
              WHERE id = ? AND status = 'pending_payment'`)
    .run(now, orderId);
}

// Refunds a paid order. Returns the resulting payment status.
export async function refundOrder(orderId: string): Promise<string> {
  const row = getDb()
    .prepare("SELECT payment_status, payment_intent_id FROM orders WHERE id = ?")
    .get(orderId) as unknown as { payment_status: string; payment_intent_id: string | null } | undefined;
  if (!row || row.payment_status !== "paid") return row?.payment_status ?? "unpaid";
  const stripe = getStripe();
  if (!stripe || !row.payment_intent_id) return "paid";
  try {
    await stripe.refunds.create({ payment_intent: row.payment_intent_id }, { idempotencyKey: `refund-${orderId}` });
    getDb().prepare("UPDATE orders SET payment_status = 'refunded' WHERE id = ?").run(orderId);
    return "refunded";
  } catch (error) {
    console.error("Refund failed for order", orderId, error);
    getDb().prepare("UPDATE orders SET payment_status = 'refund_failed' WHERE id = ?").run(orderId);
    return "refund_failed";
  }
}
