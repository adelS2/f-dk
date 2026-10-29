import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { listOrdersForUser } from "@/lib/queries";
import { formatDKK } from "@/lib/money";
import { STATUS_LABEL, courierActions } from "@/lib/status";
import OrderActions from "@/components/OrderActions";
import AutoRefresh from "@/components/AutoRefresh";

export default async function CourierDashboard() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "courier") redirect("/");
  const orders = listOrdersForUser(user);
  const mine = orders.filter((o) => o.courier_id === user.id);
  const available = orders.filter((o) => o.courier_id === null);

  const card = (o: (typeof orders)[number]) => (
    <article key={o.id} className="rounded-lg bg-white p-4 shadow-sm">
      <div className="flex items-baseline justify-between">
        <h2 className="font-semibold">{o.restaurant_name}</h2>
        <span className="text-sm text-rose-600">{STATUS_LABEL[o.status]}</span>
      </div>
      <p className="text-sm text-gray-600">Afhentes hos restaurant · Leveres til: {o.address}</p>
      <p className="mb-3 text-sm">Kunde: {o.customer_name}, {o.phone} · {formatDKK(o.total_ore)}</p>
      <OrderActions orderId={o.id} actions={courierActions(o.status, o.courier_id, user.id)} />
    </article>
  );

  return (
    <section className="flex flex-col gap-6">
      <AutoRefresh seconds={10} />
      <div>
        <h1 className="mb-3 text-2xl font-bold">Mine leveringer</h1>
        {mine.length === 0 ? <p className="text-gray-500">Ingen aktive leveringer.</p> : <div className="flex flex-col gap-3">{mine.map(card)}</div>}
      </div>
      <div>
        <h2 className="mb-3 text-xl font-bold">Ledige opgaver</h2>
        {available.length === 0 ? <p className="text-gray-500">Ingen ledige opgaver lige nu.</p> : <div className="flex flex-col gap-3">{available.map(card)}</div>}
      </div>
    </section>
  );
}
