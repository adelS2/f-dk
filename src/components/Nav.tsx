import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import LogoutButton from "./LogoutButton";
import CartLink from "./CartLink";

export default async function Nav() {
  const user = await getCurrentUser();
  return (
    <header className="border-b bg-white">
      <nav className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3 text-sm">
        <Link href="/" className="text-lg font-bold text-rose-600">FoodDK</Link>
        <Link href="/" className="hover:underline">Restauranter</Link>
        {user?.role === "customer" && <Link href="/orders" className="hover:underline">Mine bestillinger</Link>}
        {user?.role === "restaurant" && <Link href="/dashboard/restaurant" className="hover:underline">Restaurantpanel</Link>}
        {user?.role === "courier" && <Link href="/dashboard/courier" className="hover:underline">Kurerpanel</Link>}
        <div className="ml-auto flex items-center gap-4">
          {(!user || user.role === "customer") && <CartLink />}
          {user ? (
            <>
              <span className="hidden text-gray-500 sm:inline">{user.name}</span>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link href="/login" className="hover:underline">Log ind</Link>
              <Link href="/register" className="rounded bg-rose-600 px-3 py-1.5 font-medium text-white">Opret konto</Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
