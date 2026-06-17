"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { AuthGate } from "@/components/AuthGate";
import { monthKey, yen } from "@/lib/format";
import { supabase } from "@/lib/supabase";

type SaleRow = { sale_date: string; amount: number };
type ExpenseRow = { expense_date: string; amount: number };
type MonthSummary = { month: string; sales: number; expenses: number; profit: number };

function ReportsContent({ userId }: { userId: string }) {
  const [salesRows, setSalesRows] = useState<SaleRow[]>([]);
  const [expenseRows, setExpenseRows] = useState<ExpenseRow[]>([]);

  useEffect(() => {
    Promise.all([
      supabase.from("sales").select("sale_date,amount").eq("user_id", userId),
      supabase.from("expenses").select("expense_date,amount").eq("user_id", userId),
    ]).then(([salesResult, expensesResult]) => {
      setSalesRows(salesResult.data ?? []);
      setExpenseRows(expensesResult.data ?? []);
    });
  }, [userId]);

  const summaries = useMemo<MonthSummary[]>(() => {
    const map = new Map<string, MonthSummary>();
    salesRows.forEach((row) => {
      const key = monthKey(row.sale_date);
      const current = map.get(key) ?? { month: key, sales: 0, expenses: 0, profit: 0 };
      current.sales += Number(row.amount ?? 0);
      map.set(key, current);
    });
    expenseRows.forEach((row) => {
      const key = monthKey(row.expense_date);
      const current = map.get(key) ?? { month: key, sales: 0, expenses: 0, profit: 0 };
      current.expenses += Number(row.amount ?? 0);
      map.set(key, current);
    });
    return Array.from(map.values())
      .map((item) => ({ ...item, profit: item.sales - item.expenses }))
      .sort((a, b) => b.month.localeCompare(a.month));
  }, [expenseRows, salesRows]);

  const maxValue = Math.max(1, ...summaries.map((item) => Math.max(item.sales, item.expenses)));

  return (
    <AppShell title="結果を見る" subtitle="月ごとの売上、経費、利益を確認します。">
      {summaries.length === 0 ? (
        <div className="rounded-2xl bg-white p-6 text-lg font-bold text-stone-700 shadow-sm">
          まだ売上や経費がありません。
        </div>
      ) : (
        <div className="space-y-4">
          {summaries.map((item) => (
            <div key={item.month} className="rounded-2xl bg-white p-5 shadow-sm">
              <p className="text-2xl font-bold">{item.month}</p>
              <div className="mt-4 grid gap-3 text-lg font-bold sm:grid-cols-3">
                <p>売上 {yen(item.sales)}</p>
                <p>経費 {yen(item.expenses)}</p>
                <p className={item.profit >= 0 ? "text-green-800" : "text-red-700"}>利益 {yen(item.profit)}</p>
              </div>
              <div className="mt-5 space-y-3">
                <Bar label="売上" value={item.sales} max={maxValue} color="bg-green-600" />
                <Bar label="経費" value={item.expenses} max={maxValue} color="bg-orange-500" />
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}

function Bar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const width = `${Math.max(4, Math.round((value / max) * 100))}%`;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-base font-bold text-stone-700">
        <span>{label}</span>
        <span>{yen(value)}</span>
      </div>
      <div className="h-5 overflow-hidden rounded-full bg-stone-100">
        <div className={`h-full rounded-full ${color}`} style={{ width }} />
      </div>
    </div>
  );
}

export default function ReportsPage() {
  return <AuthGate>{(user) => <ReportsContent userId={user.id} />}</AuthGate>;
}
