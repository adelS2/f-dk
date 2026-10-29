import type { Metadata } from "next";
import Nav from "@/components/Nav";
import "./globals.css";

export const instant = false;

export const metadata: Metadata = {
  title: "FoodDK",
  description: "Madbestilling i Danmark",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="da" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-gray-50 text-gray-900">
        <Nav />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
