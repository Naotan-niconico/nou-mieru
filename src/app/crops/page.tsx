"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { AuthGate } from "@/components/AuthGate";
import { buttonClass, ErrorMessage, Field, inputClass, subButtonClass } from "@/components/FormParts";
import { UpgradeNotice } from "@/components/UpgradeNotice";
import { getUsageLimits } from "@/lib/subscription";
import { supabase } from "@/lib/supabase";

type Crop = { id: string; name: string; memo: string | null };

function CropsContent({ userId }: { userId: string }) {
  const [crops, setCrops] = useState<Crop[]>([]);
  const [editingId, setEditingId] = useState("");
  const [name, setName] = useState("");
  const [memo, setMemo] = useState("");
  const [error, setError] = useState("");
  const [limitReached, setLimitReached] = useState(false);

  async function load() {
    const { data } = await supabase.from("crops").select("id,name,memo").eq("user_id", userId).order("created_at");
    setCrops(data ?? []);
  }

  useEffect(() => {
    let cancelled = false;
    async function loadInitial() {
      const { data } = await supabase.from("crops").select("id,name,memo").eq("user_id", userId).order("created_at");
      if (!cancelled) setCrops(data ?? []);
    }
    void loadInitial();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!name) {
      setError("作物名を入力してください。");
      return;
    }
    setError("");
    if (!editingId) {
      const usage = await getUsageLimits(supabase, userId);
      if (!usage.isPaid && usage.crops.used >= usage.crops.limit) {
        setLimitReached(true);
        return;
      }
    }
    if (editingId) {
      await supabase.from("crops").update({ name, memo, updated_at: new Date().toISOString() }).eq("id", editingId).eq("user_id", userId);
    } else {
      await supabase.from("crops").insert({ user_id: userId, name, memo });
    }
    setEditingId("");
    setName("");
    setMemo("");
    load();
  }

  async function remove(id: string) {
    await supabase.from("crops").delete().eq("id", id).eq("user_id", userId);
    load();
  }

  function edit(crop: Crop) {
    setEditingId(crop.id);
    setName(crop.name);
    setMemo(crop.memo ?? "");
  }

  return (
    <AppShell title="作物を見る" subtitle="作っている作物を登録します。">
      <form onSubmit={save} className="space-y-4 rounded-2xl bg-white p-5 shadow-sm">
        <ErrorMessage message={error} />
        {limitReached ? <UpgradeNotice compact /> : null}
        <Field label="作物名">
          <input className={inputClass} value={name} onChange={(event) => setName(event.target.value)} required />
        </Field>
        <Field label="メモ">
          <textarea className={inputClass} value={memo} onChange={(event) => setMemo(event.target.value)} rows={3} />
        </Field>
        <button className={buttonClass}>{editingId ? "作物を保存する" : "作物を追加する"}</button>
      </form>
      <div className="mt-6 space-y-3">
        {crops.map((crop) => (
          <div key={crop.id} className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-2xl font-bold">{crop.name}</p>
            {crop.memo ? <p className="mt-2 text-lg leading-8 text-stone-700">{crop.memo}</p> : null}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button onClick={() => edit(crop)} className={subButtonClass}>編集</button>
              <button onClick={() => remove(crop.id)} className="w-full rounded-2xl border border-red-200 bg-white px-5 py-4 text-lg font-bold text-red-700">削除</button>
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}

export default function CropsPage() {
  return <AuthGate>{(user) => <CropsContent userId={user.id} />}</AuthGate>;
}
