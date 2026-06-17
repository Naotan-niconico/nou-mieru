"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { AuthGate } from "@/components/AuthGate";
import { currentMonthRange, yen } from "@/lib/format";
import { supabase } from "@/lib/supabase";

function HomeContent({ userId }: { userId: string }) {
  const [sales, setSales] = useState(0);
  const [expenses, setExpenses] = useState(0);
  const { start, end, label } = currentMonthRange();
  const profit = sales - expenses;
  const profitRate = sales > 0 ? `${Math.round((profit / sales) * 100)}%` : "未計算";

  useEffect(() => {
    async function load() {
      const [{ data: salesRows }, { data: expenseRows }] = await Promise.all([
        supabase
          .from("sales")
          .select("amount")
          .eq("user_id", userId)
          .gte("sale_date", start)
          .lt("sale_date", end),
        supabase
          .from("expenses")
          .select("amount")
          .eq("user_id", userId)
          .gte("expense_date", start)
          .lt("expense_date", end),
      ]);

      setSales((salesRows ?? []).reduce((sum, row) => sum + Number(row.amount ?? 0), 0));
      setExpenses((expenseRows ?? []).reduce((sum, row) => sum + Number(row.amount ?? 0), 0));
    }
    load();
  }, [end, start, userId]);

  const cards = [
    { label: "今月の売上", value: yen(sales), tone: "text-green-800" },
    { label: "今月の経費", value: yen(expenses), tone: "text-orange-700" },
    { label: "今月の利益", value: yen(profit), tone: profit >= 0 ? "text-green-800" : "text-red-700" },
    { label: "利益率", value: profitRate, tone: "text-stone-950" },
  ];

  const actions = [
    { href: "/sales/new", label: "売上を入れる" },
    { href: "/expenses/new", label: "経費を入れる" },
    { href: "/receipts", label: "レシートを見る" },
    { href: "/crops", label: "作物を見る" },
    { href: "/reports", label: "結果を見る" },
    { href: "/machines", label: "機械を見る" },
  ];

  return (
    <AppShell title="ホーム" subtitle={`${label}の状況です。`}>
      <section className="grid gap-4 sm:grid-cols-2">
        {cards.map((card) => (
          <div key={card.label} className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-lg font-bold text-stone-700">{card.label}</p>
            <p className={`mt-3 break-words text-4xl font-bold ${card.tone}`}>{card.value}</p>
          </div>
        ))}
      </section>
      <section className="mt-7 grid gap-3 sm:grid-cols-2">
        {actions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="rounded-2xl bg-green-700 px-5 py-5 text-center text-xl font-bold text-white shadow-sm hover:bg-green-800"
          >
            {action.label}
          </Link>
        ))}
      </section>
    </AppShell>
  );
}

export default function HomePage() {
  return <AuthGate>{(user) => <HomeContent userId={user.id} />}</AuthGate>;
}
