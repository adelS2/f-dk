import Link from "next/link";
import { listRestaurants } from "@/lib/queries";
import { formatDKK } from "@/lib/money";

export default function HomePage() {
  const restaurants = listRestaurants();
  return (
    <section>
      <h1 className="mb-4 text-2xl font-bold">Restauranter i København</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        {restaurants.map((r) => (
          <Link key={r.id} href={`/restaurants/${r.id}`} className="rounded-lg bg-white p-4 shadow-sm hover:shadow">
            <div className="flex items-baseline justify-between">
              <h2 className="text-lg font-semibold">{r.name}</h2>
              <span className={`text-xs ${r.is_open ? "text-green-600" : "text-gray-400"}`}>
                {r.is_open ? "Åben" : "Lukket"}
              </span>
            </div>
            <p className="text-sm text-gray-500">{r.cuisine} · {r.city}</p>
            <p className="mt-2 text-sm text-gray-600">
              Levering {formatDKK(r.delivery_fee_ore)} · Minimum {formatDKK(r.min_order_ore)}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
