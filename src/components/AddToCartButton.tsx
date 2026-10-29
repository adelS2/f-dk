"use client";

import { useState } from "react";
import { readCart, writeCart } from "@/lib/cart";

interface Props {
  restaurant: { id: string; name: string };
  item: { id: string; name: string; priceOre: number };
}

export default function AddToCartButton({ restaurant, item }: Props) {
  const [added, setAdded] = useState(false);

  function add() {
    let cart = readCart();
    if (cart && cart.restaurantId !== restaurant.id) {
      if (!window.confirm("Din kurv har varer fra en anden restaurant. Vil du tømme kurven først?")) return;
      cart = null;
    }
    const next = cart ?? { restaurantId: restaurant.id, restaurantName: restaurant.name, lines: [] };
    const line = next.lines.find((l) => l.menuItemId === item.id);
    if (line) line.quantity += 1;
    else next.lines.push({ menuItemId: item.id, name: item.name, priceOre: item.priceOre, quantity: 1 });
    writeCart(next);
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  }

  return (
    <button onClick={add} className="rounded border border-rose-600 px-3 py-1 text-sm font-medium text-rose-600 hover:bg-rose-50">
      {added ? "Tilføjet ✓" : "Tilføj"}
    </button>
  );
}
