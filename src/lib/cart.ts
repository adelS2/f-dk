// Client-side cart stored in localStorage. Prices are re-computed on the server at checkout.
export interface CartLine {
  menuItemId: string;
  name: string;
  priceOre: number;
  quantity: number;
}

export interface Cart {
  restaurantId: string;
  restaurantName: string;
  lines: CartLine[];
}

const KEY = "fooddk-cart";

export function readCart(): Cart | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Cart) : null;
  } catch {
    return null;
  }
}

export function writeCart(cart: Cart | null) {
  if (cart && cart.lines.length > 0) localStorage.setItem(KEY, JSON.stringify(cart));
  else localStorage.removeItem(KEY);
  window.dispatchEvent(new Event("cart-changed"));
}
