"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { AuthGate } from "@/components/AuthGate";
import { PlanGate } from "@/components/PlanGate";
import { yen } from "@/lib/format";
import { supabase } from "@/lib/supabase";

type ReceiptExpense = {
  id: string;
  expense_date: string;
  category: string;
  amount: number;
  receipt_image_url: string | null;
};

function ReceiptsList({ userId }: { userId: string }) {
  const [rows, setRows] = useState<ReceiptExpense[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("expenses")
      .select("id,expense_date,category,amount,receipt_image_url")
      .eq("user_id", userId)
      .not("receipt_image_url", "is", null)
      .order("expense_date", { ascending: false })
      .then(({ data }) => setRows(data ?? []));
  }, [userId]);

  return (
    <>
      {rows.length === 0 ? (
        <div className="rounded-2xl bg-white p-6 text-lg font-bold text-stone-700 shadow-sm">
          まだレシート画像がありません。
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {rows.map((row) => (
            <button
              key={row.id}
              onClick={() => setSelected(row.receipt_image_url)}
              className="overflow-hidden rounded-2xl bg-white text-left shadow-sm"
            >
              <div className="relative h-52 w-full bg-green-50">
                {row.receipt_image_url ? (
                  <Image src={row.receipt_image_url} alt="レシート画像" fill className="object-cover" unoptimized />
                ) : null}
              </div>
              <div className="p-4">
                <p className="text-lg font-bold">{row.expense_date}</p>
                <p className="mt-1 text-lg text-stone-700">{row.category}</p>
                <p className="mt-2 text-2xl font-bold text-orange-700">{yen(row.amount)}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {selected ? (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/70 p-4" onClick={() => setSelected(null)}>
          <div className="relative h-[80vh] w-full max-w-3xl">
            <Image src={selected} alt="拡大したレシート画像" fill className="object-contain" unoptimized />
          </div>
        </div>
      ) : null}
    </>
  );
}

export default function ReceiptsPage() {
  return (
    <AuthGate>
      {(user) => (
        <AppShell title="レシートを見る" subtitle="保存したレシート画像を確認します。">
          <PlanGate userId={user.id}>
            <ReceiptsList userId={user.id} />
          </PlanGate>
        </AppShell>
      )}
    </AuthGate>
  );
}
