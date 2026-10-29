import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { listOrdersForUser } from "@/lib/queries";
import OrderCard from "@/components/OrderCard";

export default async function OrdersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "customer") redirect("/");
  const orders = listOrdersForUser(user);
  return (
    <section>
      <h1 className="mb-4 text-2xl font-bold">Mine bestillinger</h1>
      {orders.length === 0 ? (
        <p>Du har ingen bestillinger endnu. <Link href="/" className="text-rose-600 underline">Find mad</Link></p>
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map((o) => <OrderCard key={o.id} order={o} href={`/orders/${o.id}`} />)}
        </div>
      )}
    </section>
  );
}
