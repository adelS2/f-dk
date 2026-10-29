"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const body = Object.fromEntries(form.entries());
    const res = await fetch(mode === "login" ? "/api/auth/login" : "/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Noget gik galt.");
      return;
    }
    router.push("/");
    router.refresh();
  }

  const input = "w-full rounded border px-3 py-2";
  return (
    <form onSubmit={onSubmit} className="mx-auto mt-10 flex max-w-sm flex-col gap-3">
      <h1 className="text-2xl font-bold">{mode === "login" ? "Log ind" : "Opret konto"}</h1>
      {mode === "register" && (
        <>
          <input name="name" placeholder="Navn" required className={input} />
          <input name="phone" placeholder="Telefon" className={input} />
        </>
      )}
      <input name="email" type="email" placeholder="E-mail" required className={input} />
      <input name="password" type="password" placeholder="Adgangskode" required minLength={8} className={input} />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button disabled={loading} className="rounded bg-rose-600 py-2 font-medium text-white disabled:opacity-60">
        {loading ? "Vent..." : mode === "login" ? "Log ind" : "Opret konto"}
      </button>
    </form>
  );
}
