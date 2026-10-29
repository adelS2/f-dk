"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { readCart } from "@/lib/cart";

export default function CartLink() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const update = () => {
      const cart = readCart();
      setCount(cart ? cart.lines.reduce((sum, l) => sum + l.quantity, 0) : 0);
    };
    update();
    window.addEventListener("cart-changed", update);
    return () => window.removeEventListener("cart-changed", update);
  }, []);
  return (
    <Link href="/cart" className="hover:underline">
      Kurv {count > 0 && <span className="rounded-full bg-rose-600 px-2 py-0.5 text-xs text-white">{count}</span>}
    </Link>
  );
}
