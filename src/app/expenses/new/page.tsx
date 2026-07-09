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

type ReceiptAiResult = {
  isReceipt: boolean;
  message: string;
  expenseDate: string | null;
  vendor: string | null;
  amount: number | null;
  category: string | null;
  costType: string | null;
  memo: string | null;
  rawText: string | null;
  confidence: number;
  error?: string;
};

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
  const [aiResult, setAiResult] = useState<ReceiptAiResult | null>(null);
  const [aiMessage, setAiMessage] = useState("");
  const [aiStatus, setAiStatus] = useState<"idle" | "success" | "warning" | "error">("idle");
  const [analyzingReceipt, setAnalyzingReceipt] = useState(false);

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

  async function analyzeReceiptImage(file: File) {
    setAnalyzingReceipt(true);
    setAiResult(null);
    setAiStatus("idle");
    setAiMessage("AIが画像を解析中です。レシート判定と文字読み取りをしています。");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("ログイン情報を確認できません。");
      }

      const formData = new FormData();
      formData.append("receipt", file);

      const response = await fetch("/api/receipts/analyze", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      });
      const data = (await response.json()) as ReceiptAiResult;

      if (!response.ok) {
        throw new Error(data.error || "レシートAI解析に失敗しました。");
      }

      setAiResult(data);

      if (!data.isReceipt) {
        setAiStatus("warning");
        setAiMessage(data.message || "レシートとして認識できませんでした。");
        return;
      }

      if (data.expenseDate) setExpenseDate(data.expenseDate);
      if (data.vendor) setVendor(data.vendor);
      if (typeof data.amount === "number") setAmount(String(data.amount));
      if (data.category && expenseCategories.includes(data.category)) setCategory(data.category);
      if (data.costType && costTypes.includes(data.costType)) setCostType(data.costType);
      if (data.memo || data.rawText) {
        setMemo((current) => {
          const additions = [data.memo ? `AIメモ: ${data.memo}` : null, data.rawText ? `OCR: ${data.rawText}` : null].filter(Boolean);
          return [current, ...additions].filter(Boolean).join("\n\n");
        });
      }

      setAiStatus("success");
      setAiMessage(data.message || "レシートを認識しました。内容を確認してから保存してください。");
    } catch (caughtError) {
      setAiStatus("error");
      setAiMessage(caughtError instanceof Error ? caughtError.message : "レシートAI解析に失敗しました。");
    } finally {
      setAnalyzingReceipt(false);
    }
  }

  function handleReceiptChange(file: File | null) {
    setReceipt(file);
    setAiResult(null);
    setAiMessage("");
    setAiStatus("idle");
    if (file) {
      void analyzeReceiptImage(file);
    }
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

  const aiBoxClass =
    aiStatus === "success"
      ? "border-green-200 bg-green-50 text-green-900"
      : aiStatus === "warning"
        ? "border-yellow-200 bg-yellow-50 text-yellow-900"
        : aiStatus === "error"
          ? "border-red-200 bg-red-50 text-red-800"
          : "border-stone-200 bg-stone-50 text-stone-700";

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
        <Field label="レシート画像">
          <input
            className={inputClass}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(event) => handleReceiptChange(event.target.files?.[0] ?? null)}
          />
          <span className="mt-2 block text-base font-bold text-stone-600">
            スマホならカメラを起動できます。画像を選ぶとAIが自動でレシート判定と文字読み取りを行います。
          </span>
        </Field>
        {aiMessage ? (
          <div className={`rounded-xl border px-4 py-3 text-base font-bold ${aiBoxClass}`}>
            {analyzingReceipt ? "解析中です。OCR先生、領収書の迷宮に突入中です。" : aiMessage}
          </div>
        ) : null}
        {aiResult?.isReceipt ? (
          <div className="rounded-2xl border border-green-100 bg-green-50 p-4 text-base text-green-950">
            <p className="text-lg font-bold">AI抽出結果</p>
            <p className="mt-2">支払日: {aiResult.expenseDate ?? "未取得"}</p>
            <p>支払先: {aiResult.vendor ?? "未取得"}</p>
            <p>金額: {typeof aiResult.amount === "number" ? `${aiResult.amount.toLocaleString()}円` : "未取得"}</p>
            <p>分類: {aiResult.category ?? "未取得"} / {aiResult.costType ?? "未取得"}</p>
            <p className="mt-2 text-sm font-bold text-green-800">AI入力は下書きです。保存前に金額と日付だけは指差し確認してください。</p>
          </div>
        ) : null}
        <Field label="メモ"><textarea className={inputClass} rows={3} value={memo} onChange={(event) => setMemo(event.target.value)} /></Field>
        <button className={buttonClass} disabled={saving || analyzingReceipt}>{saving ? "保存中です" : analyzingReceipt ? "AI解析中です" : "経費を保存する"}</button>
      </form>
    </AppShell>
  );
}

export default function NewExpensePage() {
  return <AuthGate>{(user) => <ExpenseForm userId={user.id} />}</AuthGate>;
}
