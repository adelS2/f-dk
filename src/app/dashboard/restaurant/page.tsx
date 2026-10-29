import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { listOrdersForUser } from "@/lib/queries";
import { formatDKK } from "@/lib/money";
import { STATUS_LABEL, restaurantActions } from "@/lib/status";
import OrderActions from "@/components/OrderActions";
import AutoRefresh from "@/components/AutoRefresh";

export default async function RestaurantDashboard() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "restaurant") redirect("/");
  const orders = listOrdersForUser(user);

  return (
    <section>
      <AutoRefresh seconds={10} />
      <h1 className="mb-4 text-2xl font-bold">Bestillinger</h1>
      {orders.length === 0 && <p className="text-gray-500">Ingen aktive bestillinger lige nu.</p>}
      <div className="flex flex-col gap-3">
        {orders.map((o) => (
          <article key={o.id} className="rounded-lg bg-white p-4 shadow-sm">
            <div className="flex items-baseline justify-between">
              <h2 className="font-semibold">#{o.id.slice(0, 8)} · {o.customer_name}</h2>
              <span className="text-sm font-medium text-rose-600">{STATUS_LABEL[o.status]}</span>
            </div>
            <ul className="my-2 text-sm">
              {o.items.map((i) => <li key={i.id}>{i.quantity}× {i.name}</li>)}
            </ul>
            {o.note && <p className="text-sm text-gray-600">Note: {o.note}</p>}
            <p className="mb-3 text-sm">Total: {formatDKK(o.total_ore)}</p>
            <OrderActions orderId={o.id} actions={restaurantActions(o.status)} />
          </article>
        ))}
      </div>
    </section>
  );
}
