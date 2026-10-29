import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { canViewOrder, getOrderWithItems } from "@/lib/queries";
import { formatDKK } from "@/lib/money";
import { STATUS_LABEL, customerActions, courierActions, restaurantActions } from "@/lib/status";
import OrderActions from "@/components/OrderActions";
import AutoRefresh from "@/components/AutoRefresh";

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const order = getOrderWithItems(id);
  if (!order || !canViewOrder(user, order)) notFound();

  const actions =
    user.role === "customer" ? customerActions(order.status)
    : user.role === "restaurant" ? restaurantActions(order.status)
    : courierActions(order.status, order.courier_id, user.id);

  return (
    <section className="mx-auto max-w-xl">
      <AutoRefresh seconds={15} />
      <h1 className="text-2xl font-bold">{order.restaurant_name}</h1>
      <p className="mb-4 text-rose-600 font-medium">{STATUS_LABEL[order.status] ?? order.status}</p>

      <div className="mb-4 rounded-lg bg-white p-4 shadow-sm">
        <ul className="divide-y">
          {order.items.map((i) => (
            <li key={i.id} className="flex justify-between py-1.5">
              <span>{i.quantity}× {i.name}</span>
              <span>{formatDKK(i.unit_price_ore * i.quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 space-y-1 border-t pt-3 text-sm">
          <p className="flex justify-between"><span>Subtotal</span><span>{formatDKK(order.subtotal_ore)}</span></p>
          <p className="flex justify-between"><span>Levering</span><span>{formatDKK(order.delivery_fee_ore)}</span></p>
          <p className="flex justify-between font-semibold"><span>I alt</span><span>{formatDKK(order.total_ore)}</span></p>
          <p className="text-xs text-gray-500">Heraf moms (25%): {formatDKK(order.vat_ore)}</p>
        </div>
      </div>

      <div className="mb-4 rounded-lg bg-white p-4 text-sm shadow-sm">
        <p><strong>Modtager:</strong> {order.customer_name}, {order.phone}</p>
        <p><strong>Adresse:</strong> {order.address}</p>
        {order.note && <p><strong>Note:</strong> {order.note}</p>}
      </div>

      {order.status === "pending_payment" && (
        <p className="mb-4 rounded bg-amber-50 p-3 text-sm text-amber-800">
          Betalingen er ikke gennemført endnu. Hvis du lukkede betalingsvinduet, skal du bestille igen fra kurven.
        </p>
      )}
      {order.payment_status === "demo" && (
        <p className="mb-4 text-xs text-gray-500">Demo-tilstand: ingen rigtig betaling er gennemført.</p>
      )}

      <OrderActions orderId={order.id} actions={actions} />
    </section>
  );
}
