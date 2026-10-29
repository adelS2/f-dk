import { notFound } from "next/navigation";
import { getMenu, getRestaurant } from "@/lib/queries";
import { formatDKK } from "@/lib/money";
import AddToCartButton from "@/components/AddToCartButton";

export default async function RestaurantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const restaurant = getRestaurant(id);
  if (!restaurant) notFound();
  const menu = getMenu(id);

  const categories = [...new Set(menu.map((m) => m.category))];
  return (
    <section>
      <h1 className="text-2xl font-bold">{restaurant.name}</h1>
      <p className="text-sm text-gray-500">
        {restaurant.cuisine} · {restaurant.address}, {restaurant.city}
      </p>
      <p className="mb-6 mt-1 text-sm text-gray-600">
        Levering {formatDKK(restaurant.delivery_fee_ore)} · Minimum {formatDKK(restaurant.min_order_ore)}
      </p>
      {categories.map((cat) => (
        <div key={cat} className="mb-6">
          <h2 className="mb-2 text-lg font-semibold">{cat}</h2>
          <ul className="divide-y rounded-lg bg-white shadow-sm">
            {menu.filter((m) => m.category === cat).map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-4 p-4">
                <div>
                  <p className="font-medium">{item.name}</p>
                  {item.description && <p className="text-sm text-gray-500">{item.description}</p>}
                  <p className="text-sm">{formatDKK(item.price_ore)}</p>
                </div>
                <AddToCartButton
                  restaurant={{ id: restaurant.id, name: restaurant.name }}
                  item={{ id: item.id, name: item.name, priceOre: item.price_ore }}
                />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
