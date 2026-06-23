"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { AuthGate } from "@/components/AuthGate";
import { buttonClass, ErrorMessage, Field, inputClass } from "@/components/FormParts";
import { UpgradeNotice } from "@/components/UpgradeNotice";
import { costTypes, expenseCategories } from "@/lib/constants";
import { todayIso } from "@/lib/format";
import { getUsageLimits } from "@/lib/subscription";
import { supabase } from "@/lib/supabase";

type Crop = { id: string; name: string };
type Machine = { id: string; name: string };

function ExpenseForm({ userId }: { userId: string }) {
  const router = useRouter();
  const [crops, setCrops] = useState<Crop[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [expenseDate, setExpenseDate] = useState(todayIso());
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [vendor, setVendor] = useState("");
  const [cropId, setCropId] = useState("");
  const [costType, setCostType] = useState("未分類");
  const [machineId, setMachineId] = useState("");
  const [receipt, setReceipt] = useState<File | null>(null);
  const [memo, setMemo] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [limitReached, setLimitReached] = useState(false);

  useEffect(() => {
    Promise.all([
      supabase.from("crops").select("id,name").eq("user_id", userId).order("created_at"),
      supabase.from("machines").select("id,name").eq("user_id", userId).order("created_at"),
    ]).then(([cropResult, machineResult]) => {
      setCrops(cropResult.data ?? []);
      setMachines(machineResult.data ?? []);
    });
  }, [userId]);

  async function uploadReceipt() {
    if (!receipt) return null;
    const safeName = receipt.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${userId}/${Date.now()}-${safeName}`;
    const { error: uploadError } = await supabase.storage.from("receipts").upload(path, receipt);
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from("receipts").getPublicUrl(path);
    return data.publicUrl;
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const amountNumber = Number(amount);
    if (!expenseDate || !category || amount === "" || amountNumber < 0) {
      setError("支払日、経費カテゴリ、金額を確認してください。");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const usage = await getUsageLimits(supabase, userId);
      if (!usage.isPaid && usage.monthlyExpenses.used >= usage.monthlyExpenses.limit) {
        setLimitReached(true);
        return;
      }
      const receiptUrl = await uploadReceipt();
      const { error: saveError } = await supabase.from("expenses").insert({
        user_id: userId,
        crop_id: cropId || null,
        machine_id: machineId || null,
        expense_date: expenseDate,
        category,
        cost_type: costType,
        amount: amountNumber,
        vendor,
        receipt_image_url: receiptUrl,
        memo,
      });
      if (saveError) throw saveError;
      router.push("/home");
    } catch {
      setError("経費を保存できませんでした。Storageとテーブル設定を確認してください。");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell title="経費を入れる" subtitle="支払った日と金額を入力します。">
      <form onSubmit={save} className="space-y-4 rounded-2xl bg-white p-5 shadow-sm">
        <ErrorMessage message={error} />
        {limitReached ? <UpgradeNotice compact /> : null}
        <Field label="支払日"><input className={inputClass} type="date" value={expenseDate} onChange={(event) => setExpenseDate(event.target.value)} required /></Field>
        <Field label="経費カテゴリ">
          <select className={inputClass} value={category} onChange={(event) => setCategory(event.target.value)} required>
            <option value="">選んでください</option>
            {expenseCategories.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </Field>
        <Field label="金額"><input className={inputClass} type="number" min="0" value={amount} onChange={(event) => setAmount(event.target.value)} required /></Field>
        <Field label="支払先"><input className={inputClass} value={vendor} onChange={(event) => setVendor(event.target.value)} /></Field>
        <Field label="関連作物">
          <select className={inputClass} value={cropId} onChange={(event) => setCropId(event.target.value)}>
            <option value="">なし</option>
            {crops.map((crop) => <option key={crop.id} value={crop.id}>{crop.name}</option>)}
          </select>
        </Field>
        <Field label="固定費・変動費">
          <select className={inputClass} value={costType} onChange={(event) => setCostType(event.target.value)}>
            {costTypes.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </Field>
        <Field label="関連機械">
          <select className={inputClass} value={machineId} onChange={(event) => setMachineId(event.target.value)}>
            <option value="">なし</option>
            {machines.map((machine) => <option key={machine.id} value={machine.id}>{machine.name}</option>)}
          </select>
        </Field>
        <Field label="レシート画像"><input className={inputClass} type="file" accept="image/*" onChange={(event) => setReceipt(event.target.files?.[0] ?? null)} /></Field>
        <Field label="メモ"><textarea className={inputClass} rows={3} value={memo} onChange={(event) => setMemo(event.target.value)} /></Field>
        <button className={buttonClass} disabled={saving}>{saving ? "保存中です" : "経費を保存する"}</button>
      </form>
    </AppShell>
  );
}

export default function NewExpensePage() {
  return <AuthGate>{(user) => <ExpenseForm userId={user.id} />}</AuthGate>;
}
