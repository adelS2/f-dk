import { randomUUID } from "node:crypto";
import { getDb } from "./db";
import type { CurrentUser } from "./auth";
import { formatDKK } from "./money";
import { canViewOrder, type OrderRecord } from "./queries";

// Danish menu prices include moms (25%), so VAT is extracted from the gross total.
const VAT_PERCENT = 25;

export class OrderError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export interface CheckoutInput {
  items: { menuItemId: string; quantity: number }[];
  name: string;
  phone: string;
  address: string;
  note?: string;
}

interface MenuRow {
  id: string;
  restaurant_id: string;
  name: string;
  price_ore: number;
  is_available: number;
}

interface RestaurantRow {
  id: string;
  name: string;
  is_open: number;
  delivery_fee_ore: number;
  min_order_ore: number;
}

export function createOrder(user: CurrentUser, input: CheckoutInput): string {
  if (user.role !== "customer") throw new OrderError("Kun kunder kan lægge bestillinger.", 403);

  const name = input.name?.trim() ?? "";
  const phone = input.phone?.trim() ?? "";
  const address = input.address?.trim() ?? "";
  const note = (input.note ?? "").trim().slice(0, 500);
  if (!name || !phone || !address) throw new OrderError("Navn, telefon og adresse er påkrævet.");
  if (!Array.isArray(input.items) || input.items.length === 0) throw new OrderError("Kurven er tom.");

  const db = getDb();
  db.exec("BEGIN IMMEDIATE");
  try {
    const restaurantIds = new Set<string>();
    const lines: { menuItemId: string; name: string; unitPrice: number; quantity: number }[] = [];
    let subtotal = 0;

    for (const item of input.items) {
      const qty = Math.floor(Number(item.quantity));
      if (!item.menuItemId || !Number.isInteger(qty) || qty < 1 || qty > 50) {
        throw new OrderError("Ugyldig mængde.");
      }
      const menu = db
        .prepare("SELECT id, restaurant_id, name, price_ore, is_available FROM menu_items WHERE id = ?")
        .get(item.menuItemId) as unknown as MenuRow | undefined;
      if (!menu || !menu.is_available) throw new OrderError("En af varerne er ikke længere tilgængelig.");
      restaurantIds.add(menu.restaurant_id);
      lines.push({ menuItemId: menu.id, name: menu.name, unitPrice: menu.price_ore, quantity: qty });
      subtotal += menu.price_ore * qty;
    }

    if (restaurantIds.size !== 1) throw new OrderError("Alle varer skal være fra samme restaurant.");
    const restaurantId = [...restaurantIds][0];
    const restaurant = db.prepare("SELECT id, name, is_open, delivery_fee_ore, min_order_ore FROM restaurants WHERE id = ?")
      .get(restaurantId) as unknown as RestaurantRow;
    if (!restaurant.is_open) throw new OrderError("Restauranten er lukket lige nu.");
    if (subtotal < restaurant.min_order_ore) {
      throw new OrderError(`Minimumsordre er ${formatDKK(restaurant.min_order_ore)} (før levering).`);
    }

    const deliveryFee = restaurant.delivery_fee_ore;
    const total = subtotal + deliveryFee;
    const vat = Math.round((total * VAT_PERCENT) / (100 + VAT_PERCENT));
    const orderId = randomUUID();
    const now = new Date().toISOString();

    db.prepare(`INSERT INTO orders (id, customer_id, restaurant_id, courier_id, status, subtotal_ore, delivery_fee_ore,
                  vat_ore, total_ore, customer_name, phone, address, note, created_at, updated_at)
                VALUES (?, ?, ?, NULL, 'placed', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(orderId, user.id, restaurantId, subtotal, deliveryFee, vat, total, name, phone, address, note, now, now);

    for (const line of lines) {
      db.prepare(`INSERT INTO order_items (id, order_id, menu_item_id, name, unit_price_ore, quantity)
                  VALUES (?, ?, ?, ?, ?, ?)`)
        .run(randomUUID(), orderId, line.menuItemId, line.name, line.unitPrice, line.quantity);
    }

    db.exec("COMMIT");
    return orderId;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export const ORDER_ACTIONS = ["accept", "reject", "prepare", "ready", "claim", "pickup", "deliver", "cancel"] as const;
export type OrderAction = (typeof ORDER_ACTIONS)[number];

export function transitionOrder(user: CurrentUser, orderId: string, action: string): { status: string } {
  const db = getDb();
  const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(orderId) as unknown as OrderRecord | undefined;
  if (!order) throw new OrderError("Bestillingen findes ikke.", 404);
  if (!canViewOrder(user, order)) throw new OrderError("Du har ikke adgang til denne bestilling.", 403);

  const now = new Date().toISOString();
  const run = (sql: string, ...params: (string | null)[]) => Number(db.prepare(sql).run(...params).changes);
  let changes = 0;

  const requireRestaurant = () => {
    if (user.role !== "restaurant") throw new OrderError("Kun restauranten kan gøre dette.", 403);
  };
  const requireCourier = () => {
    if (user.role !== "courier") throw new OrderError("Kun kurerer kan gøre dette.", 403);
  };

  switch (action as OrderAction) {
    case "accept":
      requireRestaurant();
      changes = run("UPDATE orders SET status='accepted', updated_at=? WHERE id=? AND status='placed'", now, orderId);
      break;
    case "reject":
      requireRestaurant();
      changes = run("UPDATE orders SET status='cancelled', updated_at=? WHERE id=? AND status='placed'", now, orderId);
      break;
    case "prepare":
      requireRestaurant();
      changes = run("UPDATE orders SET status='preparing', updated_at=? WHERE id=? AND status='accepted'", now, orderId);
      break;
    case "ready":
      requireRestaurant();
      changes = run("UPDATE orders SET status='ready', updated_at=? WHERE id=? AND status='preparing'", now, orderId);
      break;
    case "claim":
      requireCourier();
      changes = run(
        "UPDATE orders SET courier_id=?, updated_at=? WHERE id=? AND status='ready' AND courier_id IS NULL",
        user.id, now, orderId,
      );
      break;
    case "pickup":
      requireCourier();
      changes = run(
        "UPDATE orders SET status='picked_up', updated_at=? WHERE id=? AND courier_id=? AND status='ready'",
        now, orderId, user.id,
      );
      break;
    case "deliver":
      requireCourier();
      changes = run(
        "UPDATE orders SET status='delivered', updated_at=? WHERE id=? AND courier_id=? AND status='picked_up'",
        now, orderId, user.id,
      );
      break;
    case "cancel":
      if (user.role !== "customer" || order.customer_id !== user.id) {
        throw new OrderError("Du kan kun annullere dine egne bestillinger.", 403);
      }
      changes = run("UPDATE orders SET status='cancelled', updated_at=? WHERE id=? AND status='placed'", now, orderId);
      break;
    default:
      throw new OrderError("Ukendt handling.");
  }

  if (changes === 0) throw new OrderError("Handlingen er ikke tilladt i den nuværende status.", 409);
  const updated = db.prepare("SELECT status FROM orders WHERE id = ?").get(orderId) as unknown as { status: string };
  return { status: updated.status };
}
