"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { AuthGate } from "@/components/AuthGate";
import { buttonClass, ErrorMessage, Field, inputClass } from "@/components/FormParts";
import { UpgradeNotice } from "@/components/UpgradeNotice";
import { todayIso } from "@/lib/format";
import { units } from "@/lib/constants";
import { getUsageLimits } from "@/lib/subscription";
import { supabase } from "@/lib/supabase";

type Crop = { id: string; name: string };

function SalesForm({ userId }: { userId: string }) {
  const router = useRouter();
  const [crops, setCrops] = useState<Crop[]>([]);
  const [saleDate, setSaleDate] = useState(todayIso());
  const [cropId, setCropId] = useState("");
  const [buyer, setBuyer] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("kg");
  const [unitPrice, setUnitPrice] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [error, setError] = useState("");
  const [limitReached, setLimitReached] = useState(false);

  useEffect(() => {
    supabase.from("crops").select("id,name").eq("user_id", userId).order("created_at").then(({ data }) => {
      setCrops(data ?? []);
    });
  }, [userId]);

  function updateQuantity(value: string) {
    setQuantity(value);
    if (value && unitPrice) {
      setAmount(String(Math.round(Number(value) * Number(unitPrice))));
    }
  }

  function updateUnitPrice(value: string) {
    setUnitPrice(value);
    if (quantity && value) {
      setAmount(String(Math.round(Number(quantity) * Number(value))));
    }
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const amountNumber = Number(amount);
    if (!saleDate || !cropId || amount === "" || amountNumber < 0) {
      setError("販売日、作物、売上金額を確認してください。");
      return;
    }

    const usage = await getUsageLimits(supabase, userId);
    if (!usage.isPaid && usage.monthlySales.used >= usage.monthlySales.limit) {
      setLimitReached(true);
      return;
    }

    const { error: saveError } = await supabase.from("sales").insert({
      user_id: userId,
      crop_id: cropId,
      sale_date: saleDate,
      buyer,
      quantity: quantity ? Number(quantity) : null,
      unit,
      unit_price: unitPrice ? Number(unitPrice) : null,
      amount: amountNumber,
      memo,
    });

    if (saveError) {
      setError("売上を保存できませんでした。");
      return;
    }
    router.push("/home");
  }

  return (
    <AppShell title="売上を入れる" subtitle="販売した日と金額を入力します。">
      <form onSubmit={save} className="space-y-4 rounded-2xl bg-white p-5 shadow-sm">
        <ErrorMessage message={error} />
        {limitReached ? <UpgradeNotice compact /> : null}
        <Field label="販売日"><input className={inputClass} type="date" value={saleDate} onChange={(event) => setSaleDate(event.target.value)} required /></Field>
        <Field label="作物">
          <select className={inputClass} value={cropId} onChange={(event) => setCropId(event.target.value)} required>
            <option value="">選んでください</option>
            {crops.map((crop) => <option key={crop.id} value={crop.id}>{crop.name}</option>)}
          </select>
        </Field>
        <Field label="販売先"><input className={inputClass} value={buyer} onChange={(event) => setBuyer(event.target.value)} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="販売量"><input className={inputClass} type="number" min="0" step="0.01" value={quantity} onChange={(event) => updateQuantity(event.target.value)} /></Field>
          <Field label="単位">
            <select className={inputClass} value={unit} onChange={(event) => setUnit(event.target.value)}>
              {units.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </Field>
        </div>
        <Field label="単価"><input className={inputClass} type="number" min="0" step="0.01" value={unitPrice} onChange={(event) => updateUnitPrice(event.target.value)} /></Field>
        <Field label="売上金額"><input className={inputClass} type="number" min="0" value={amount} onChange={(event) => setAmount(event.target.value)} required /></Field>
        <Field label="メモ"><textarea className={inputClass} rows={3} value={memo} onChange={(event) => setMemo(event.target.value)} /></Field>
        <button className={buttonClass}>売上を保存する</button>
      </form>
    </AppShell>
  );
}

export default function NewSalePage() {
  return <AuthGate>{(user) => <SalesForm userId={user.id} />}</AuthGate>;
}
