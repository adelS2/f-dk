import { getDb } from "./db";
import type { CurrentUser } from "./auth";

export interface Restaurant {
  id: string;
  name: string;
  description: string;
  cuisine: string;
  address: string;
  city: string;
  delivery_fee_ore: number;
  min_order_ore: number;
  is_open: number;
}

export interface MenuItem {
  id: string;
  restaurant_id: string;
  name: string;
  description: string;
  price_ore: number;
  category: string;
  is_available: number;
}

export interface OrderRecord {
  id: string;
  customer_id: string;
  restaurant_id: string;
  courier_id: string | null;
  status: string;
  subtotal_ore: number;
  delivery_fee_ore: number;
  vat_ore: number;
  total_ore: number;
  customer_name: string;
  phone: string;
  address: string;
  note: string;
  payment_status: string;
  created_at: string;
  updated_at: string;
}

export interface OrderItemRecord {
  id: string;
  order_id: string;
  menu_item_id: string;
  name: string;
  unit_price_ore: number;
  quantity: number;
}

export interface OrderWithItems extends OrderRecord {
  items: OrderItemRecord[];
  restaurant_name: string;
}

export function listRestaurants(): Restaurant[] {
  return getDb().prepare("SELECT * FROM restaurants ORDER BY name").all() as unknown as Restaurant[];
}

export function getRestaurant(id: string): Restaurant | undefined {
  return getDb().prepare("SELECT * FROM restaurants WHERE id = ?").get(id) as unknown as Restaurant | undefined;
}

export function getMenu(restaurantId: string): MenuItem[] {
  return getDb()
    .prepare("SELECT * FROM menu_items WHERE restaurant_id = ? ORDER BY category, name")
    .all(restaurantId) as unknown as MenuItem[];
}

export function getOrderWithItems(id: string): OrderWithItems | undefined {
  const db = getDb();
  const order = db
    .prepare(
      `SELECT o.*, r.name AS restaurant_name FROM orders o
       JOIN restaurants r ON r.id = o.restaurant_id WHERE o.id = ?`,
    )
    .get(id) as unknown as (OrderWithItems | undefined);
  if (!order) return undefined;
  const items = db
    .prepare("SELECT * FROM order_items WHERE order_id = ? ORDER BY rowid")
    .all(id) as unknown as OrderItemRecord[];
  return { ...order, items };
}

export function canViewOrder(user: CurrentUser, order: OrderRecord): boolean {
  if (user.role === "customer") return order.customer_id === user.id;
  if (user.role === "restaurant") return order.restaurant_id === user.restaurantId;
  if (user.role === "courier") return order.courier_id === user.id || (order.status === "ready" && order.courier_id === null);
  return false;
}

export function listOrdersForUser(user: CurrentUser): OrderWithItems[] {
  const db = getDb();
  let sql: string;
  let params: string[];
  if (user.role === "customer") {
    sql = "SELECT o.*, r.name AS restaurant_name FROM orders o JOIN restaurants r ON r.id = o.restaurant_id WHERE o.customer_id = ? ORDER BY o.created_at DESC LIMIT 100";
    params = [user.id];
  } else if (user.role === "restaurant") {
    sql = "SELECT o.*, r.name AS restaurant_name FROM orders o JOIN restaurants r ON r.id = o.restaurant_id WHERE o.restaurant_id = ? AND o.status NOT IN ('delivered','cancelled','pending_payment') ORDER BY o.created_at ASC LIMIT 100";
    params = [user.restaurantId ?? ""];
  } else {
    sql = `SELECT o.*, r.name AS restaurant_name FROM orders o JOIN restaurants r ON r.id = o.restaurant_id
           WHERE o.courier_id = ? OR (o.status = 'ready' AND o.courier_id IS NULL)
           ORDER BY o.created_at ASC LIMIT 100`;
    params = [user.id];
  }
  const orders = db.prepare(sql).all(...params) as unknown as (OrderRecord & { restaurant_name: string })[];
  return orders.map((o) => ({
    ...o,
    items: db.prepare("SELECT * FROM order_items WHERE order_id = ? ORDER BY rowid").all(o.id) as unknown as OrderItemRecord[],
  }));
}
