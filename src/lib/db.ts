import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { hashPassword } from "./password";

const globalForDb = globalThis as unknown as { __fooddkDb?: DatabaseSync };

const SCHEMA = `
CREATE TABLE IF NOT EXISTS restaurants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  cuisine TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  delivery_fee_ore INTEGER NOT NULL,
  min_order_ore INTEGER NOT NULL,
  is_open INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS menu_items (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL REFERENCES restaurants(id),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price_ore INTEGER NOT NULL,
  category TEXT NOT NULL,
  is_available INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('customer','restaurant','courier')),
  restaurant_id TEXT REFERENCES restaurants(id),
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES users(id),
  restaurant_id TEXT NOT NULL REFERENCES restaurants(id),
  courier_id TEXT REFERENCES users(id),
  status TEXT NOT NULL,
  subtotal_ore INTEGER NOT NULL,
  delivery_fee_ore INTEGER NOT NULL,
  vat_ore INTEGER NOT NULL,
  total_ore INTEGER NOT NULL,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id),
  menu_item_id TEXT NOT NULL,
  name TEXT NOT NULL,
  unit_price_ore INTEGER NOT NULL,
  quantity INTEGER NOT NULL
);
`;

const SEED_RESTAURANTS = [
  { id: "r-smorrebrod", name: "Smørrebrød Hjørnet", cuisine: "Dansk", city: "København K", address: "Vestergade 12", delivery_fee_ore: 2990, min_order_ore: 9900,
    items: [
      { name: "Rugbrød med laks", price: 8900, category: "Smørrebrød" },
      { name: "Leverpostej med bacon", price: 7900, category: "Smørrebrød" },
      { name: "Hakkebøf med løg", price: 9500, category: "Smørrebrød" },
      { name: "Kartoffelsalat", price: 3900, category: "Tilbehør" },
    ] },
  { id: "r-nordic-bowl", name: "Nordic Bowl", cuisine: "Sund mad", city: "København Ø", address: "Øster Farimagsgade 5", delivery_fee_ore: 3490, min_order_ore: 8900,
    items: [
      { name: "Lakse-bowl", price: 10900, category: "Bowls" },
      { name: "Falafel-bowl", price: 9500, category: "Bowls" },
      { name: "Havremælk-smoothie", price: 4900, category: "Drikke" },
    ] },
  { id: "r-pizza-vesterbro", name: "Pizzeria Vesterbro", cuisine: "Pizza", city: "København V", address: "Istedgade 40", delivery_fee_ore: 2490, min_order_ore: 12000,
    items: [
      { name: "Margherita", price: 9500, category: "Pizza" },
      { name: "Pepperoni", price: 11000, category: "Pizza" },
      { name: "Hvidløgsbrød", price: 4500, category: "Tilbehør" },
    ] },
  { id: "r-sushi-norrebro", name: "Sushi Nørrebro", cuisine: "Japansk", city: "København N", address: "Nørrebrogade 80", delivery_fee_ore: 3990, min_order_ore: 15000,
    items: [
      { name: "California roll (8 stk.)", price: 8900, category: "Sushi" },
      { name: "Lax nigiri (2 stk.)", price: 4900, category: "Sushi" },
      { name: "Miso-suppe", price: 3500, category: "Varme retter" },
    ] },
];

// Demo accounts for local development only. Password for all: demo1234
const SEED_USERS = [
  { email: "kunde@fooddk.dk", name: "Demo Kunde", role: "customer", restaurantId: null },
  { email: "smorrebrod@fooddk.dk", name: "Smørrebrød Hjørnet", role: "restaurant", restaurantId: "r-smorrebrod" },
  { email: "nordic@fooddk.dk", name: "Nordic Bowl", role: "restaurant", restaurantId: "r-nordic-bowl" },
  { email: "pizza@fooddk.dk", name: "Pizzeria Vesterbro", role: "restaurant", restaurantId: "r-pizza-vesterbro" },
  { email: "sushi@fooddk.dk", name: "Sushi Nørrebro", role: "restaurant", restaurantId: "r-sushi-norrebro" },
  { email: "kurer@fooddk.dk", name: "Demo Kurer", role: "courier", restaurantId: null },
] as const;

function migrate(db: DatabaseSync) {
  db.exec(SCHEMA);
}

function seedIfEmpty(db: DatabaseSync) {
  const count = db.prepare("SELECT COUNT(*) AS c FROM restaurants").get() as { c: number };
  if (count.c > 0) return;
  db.exec("BEGIN");
  try {
    for (const r of SEED_RESTAURANTS) {
      db.prepare(`INSERT INTO restaurants (id,name,description,cuisine,address,city,delivery_fee_ore,min_order_ore,is_open)
                  VALUES (?,?,?,?,?,?,?,?,1)`)
        .run(r.id, r.name, "", r.cuisine, r.address, r.city, r.delivery_fee_ore, r.min_order_ore);
      for (const item of r.items) {
        db.prepare(`INSERT INTO menu_items (id,restaurant_id,name,description,price_ore,category,is_available)
                    VALUES (?,?,?,?,?,?,1)`)
          .run(randomUUID(), r.id, item.name, "", item.price, item.category);
      }
    }
    const hash = hashPassword("demo1234");
    for (const u of SEED_USERS) {
      db.prepare(`INSERT INTO users (id,email,name,phone,password_hash,role,restaurant_id,created_at)
                  VALUES (?,?,?,?,?,?,?,?)`)
        .run(randomUUID(), u.email, u.name, "", hash, u.role, u.restaurantId, new Date().toISOString());
    }
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}

export function getDb(): DatabaseSync {
  if (!globalForDb.__fooddkDb) {
    const dir = path.join(process.cwd(), "data");
    fs.mkdirSync(dir, { recursive: true });
    const db = new DatabaseSync(path.join(dir, "fooddk.db"));
    db.exec("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;");
    migrate(db);
    seedIfEmpty(db);
    globalForDb.__fooddkDb = db;
  }
  return globalForDb.__fooddkDb;
}
