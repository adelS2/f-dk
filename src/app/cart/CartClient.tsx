"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { readCart, writeCart, type Cart } from "@/lib/cart";
import { formatDKK } from "@/lib/money";

export default function CartClient() {
  const router = useRouter();
  const [cart, setCart] = useState<Cart | null | undefined>(undefined);
  const [form, setForm] = useState({ name: "", phone: "", address: "", note: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const sync = () => setCart(readCart());
    sync();
    window.addEventListener("cart-changed", sync);
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.user) setForm((f) => ({ ...f, name: f.name || data.user.name }));
      });
    return () => window.removeEventListener("cart-changed", sync);
  }, []);

  if (cart === undefined) return <p className="text-gray-500">Indlæser kurv...</p>;
  if (!cart || cart.lines.length === 0) {
    return (
      <div className="text-center">
        <p className="mb-4">Din kurv er tom.</p>
        <Link href="/" className="text-rose-600 underline">Find en restaurant</Link>
      </div>
    );
  }

  const subtotal = cart.lines.reduce((s, l) => s + l.priceOre * l.quantity, 0);

  function changeQty(menuItemId: string, delta: number) {
    if (!cart) return;
    const lines = cart.lines
      .map((l) => (l.menuItemId === menuItemId ? { ...l, quantity: l.quantity + delta } : l))
      .filter((l) => l.quantity > 0);
    const next = { ...cart, lines };
    writeCart(next.lines.length ? next : null);
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!cart) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        items: cart.lines.map((l) => ({ menuItemId: l.menuItemId, quantity: l.quantity })),
      }),
    });
    setBusy(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Bestillingen mislykkedes.");
      return;
    }
    writeCart(null);
    if (data.checkoutUrl) {
      window.location.href = data.checkoutUrl;
      return;
    }
    router.push(`/orders/${data.id}`);
  }

  const input = "w-full rounded border px-3 py-2";
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <section className="rounded-lg bg-white p-4 shadow-sm">
        <h1 className="mb-3 text-xl font-bold">{cart.restaurantName}</h1>
        <ul className="divide-y">
          {cart.lines.map((l) => (
            <li key={l.menuItemId} className="flex items-center justify-between py-2">
              <span>{l.name}</span>
              <span className="flex items-center gap-2">
                <button onClick={() => changeQty(l.menuItemId, -1)} className="h-7 w-7 rounded border">−</button>
                <span className="w-6 text-center">{l.quantity}</span>
                <button onClick={() => changeQty(l.menuItemId, 1)} className="h-7 w-7 rounded border">+</button>
                <span className="w-24 text-right">{formatDKK(l.priceOre * l.quantity)}</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 flex justify-between font-medium">
          <span>Subtotal</span><span>{formatDKK(subtotal)}</span>
        </p>
        <p className="text-xs text-gray-500">Levering og endelig pris beregnes ved bestilling. Priser inkl. moms.</p>
      </section>

      <form onSubmit={submit} className="flex flex-col gap-3 rounded-lg bg-white p-4 shadow-sm">
        <h2 className="text-xl font-bold">Levering</h2>
        <input className={input} placeholder="Navn" required value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className={input} placeholder="Telefon" required value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <input className={input} placeholder="Leveringsadresse" required value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })} />
        <textarea className={input} placeholder="Note til restauranten (valgfri)" rows={2} value={form.note}
          onChange={(e) => setForm({ ...form, note: e.target.value })} />
        {error && (
          <p className="text-sm text-red-600">
            {error}{" "}
            {error.includes("logget") || error.includes("Log ind") ? <Link href="/login" className="underline">Log ind</Link> : null}
          </p>
        )}
        <button disabled={busy} className="rounded bg-rose-600 py-2 font-medium text-white disabled:opacity-60">
          {busy ? "Sender..." : "Bestil"}
        </button>
        <p className="text-xs text-gray-500">Betaling er i demoversion. Rigtig betaling tilføjes i næste fase.</p>
      </form>
    </div>
  );
}
