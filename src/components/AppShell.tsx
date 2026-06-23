"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const navItems = [
  { href: "/home", label: "ホーム" },
  { href: "/sales/new", label: "売上" },
  { href: "/expenses/new", label: "経費" },
  { href: "/reports", label: "結果" },
  { href: "/crops", label: "作物" },
  { href: "/machines", label: "機械" },
];

export function AppShell({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  const router = useRouter();

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-[#f6faf5] text-stone-950">
      <header className="border-b border-green-100 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
          <Link href="/home" className="block">
            <p className="text-2xl font-bold text-green-800">農みえる</p>
            <p className="text-sm text-stone-600">岩手農業リフォーラム</p>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/subscribe" className="rounded-xl bg-green-700 px-4 py-3 text-base font-bold text-white">
              プラン
            </Link>
            <button
              onClick={signOut}
              className="rounded-xl border border-green-200 bg-white px-4 py-3 text-base font-bold text-green-800"
            >
              ログアウト
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-28 pt-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-normal text-stone-950">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-2 text-lg leading-8 text-stone-700">{subtitle}</p>
          ) : null}
        </div>
        {children}
      </main>

      <nav className="fixed inset-x-0 bottom-0 border-t border-green-100 bg-white">
        <div className="mx-auto grid max-w-5xl grid-cols-6 gap-1 px-2 py-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-xl px-1 py-3 text-center text-sm font-bold text-green-900 hover:bg-green-50"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
