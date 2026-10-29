import Link from "next/link";
import { formatDKK } from "@/lib/money";
import { STATUS_LABEL } from "@/lib/status";
import type { OrderWithItems } from "@/lib/queries";

export default function OrderCard({ order, href }: { order: OrderWithItems; href: string }) {
  return (
    <Link href={href} className="block rounded-lg bg-white p-4 shadow-sm hover:shadow">
      <div className="flex items-baseline justify-between">
        <h3 className="font-semibold">{order.restaurant_name}</h3>
        <span className="text-sm font-medium text-rose-600">{STATUS_LABEL[order.status] ?? order.status}</span>
      </div>
      <p className="text-sm text-gray-500">
        {order.items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}
      </p>
      <p className="mt-1 text-sm">
        {formatDKK(order.total_ore)} · {new Date(order.created_at).toLocaleString("da-DK")}
      </p>
    </Link>
  );
}
