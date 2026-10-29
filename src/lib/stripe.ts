import Stripe from "stripe";

let client: Stripe | null = null;

// Payments are enabled only when a Stripe secret key is configured.
// Without it the app runs in demo mode (orders are placed without payment).
export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!client) client = new Stripe(key);
  return client;
}

export function platformFeeBps(): number {
  const percent = Number(process.env.PLATFORM_FEE_PERCENT ?? "10");
  return Math.round(Math.min(Math.max(percent, 0), 50) * 100);
}

export function appUrl(req?: Request): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  if (req) return new URL(req.url).origin;
  return "http://localhost:3000";
}
