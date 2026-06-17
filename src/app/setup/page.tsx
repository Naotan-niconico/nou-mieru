"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthGate } from "@/components/AuthGate";
import { buttonClass, ErrorMessage, Field, inputClass } from "@/components/FormParts";
import { industryTypes } from "@/lib/constants";
import { supabase } from "@/lib/supabase";

function SetupForm({ userId, email }: { userId: string; email?: string }) {
  const router = useRouter();
  const [farmName, setFarmName] = useState("");
  const [name, setName] = useState("");
  const [industryType, setIndustryType] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!farmName || !name || !industryType) {
      setError("すべて入力してください。");
      return;
    }

    setSaving(true);
    setError("");
    const { error: saveError } = await supabase.from("profiles").upsert(
      {
        user_id: userId,
        farm_name: farmName,
        name,
        email,
        industry_type: industryType,
        initial_setup_completed: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    setSaving(false);

    if (saveError) {
      setError("保存できませんでした。Supabaseの設定を確認してください。");
      return;
    }

    router.push("/home");
  }

  return (
    <main className="min-h-screen bg-[#f6faf5] px-4 py-8">
      <form onSubmit={onSubmit} className="mx-auto max-w-md space-y-5 rounded-2xl bg-white p-5 shadow-sm">
        <div>
          <p className="text-4xl font-bold text-green-800">農みえる</p>
          <h1 className="mt-6 text-3xl font-bold">はじめの設定</h1>
          <p className="mt-2 text-lg leading-8 text-stone-700">
            農園の情報を1つだけ登録します。農業カテゴリはあとから上位プランで増やす想定です。
          </p>
        </div>
        <ErrorMessage message={error} />
        <Field label="農家名または農園名">
          <input className={inputClass} value={farmName} onChange={(event) => setFarmName(event.target.value)} required />
        </Field>
        <Field label="氏名">
          <input className={inputClass} value={name} onChange={(event) => setName(event.target.value)} required />
        </Field>
        <Field label="農業カテゴリ">
          <select className={inputClass} value={industryType} onChange={(event) => setIndustryType(event.target.value)} required>
            <option value="">選んでください</option>
            {industryTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </Field>
        <button className={buttonClass} disabled={saving}>
          {saving ? "保存中です" : "保存する"}
        </button>
      </form>
    </main>
  );
}

export default function SetupPage() {
  return (
    <AuthGate requireSetup={false}>
      {(user) => <SetupForm userId={user.id} email={user.email} />}
    </AuthGate>
  );
}
