"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { AuthGate } from "@/components/AuthGate";
import { buttonClass, ErrorMessage, Field, inputClass, subButtonClass } from "@/components/FormParts";
import { UpgradeNotice } from "@/components/UpgradeNotice";
import { machineTypes } from "@/lib/constants";
import { yen } from "@/lib/format";
import { getUsageLimits } from "@/lib/subscription";
import { supabase } from "@/lib/supabase";

type Machine = { id: string; name: string; machine_type: string | null; purchase_date: string | null; purchase_price: number | null; memo: string | null };

function MachinesContent({ userId }: { userId: string }) {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [editingId, setEditingId] = useState("");
  const [name, setName] = useState("");
  const [machineType, setMachineType] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [memo, setMemo] = useState("");
  const [error, setError] = useState("");
  const [limitReached, setLimitReached] = useState(false);

  async function load() {
    const { data } = await supabase.from("machines").select("*").eq("user_id", userId).order("created_at");
    setMachines(data ?? []);
  }

  useEffect(() => {
    let cancelled = false;
    async function loadInitial() {
      const { data } = await supabase.from("machines").select("*").eq("user_id", userId).order("created_at");
      if (!cancelled) setMachines(data ?? []);
    }
    void loadInitial();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!name) {
      setError("機械名を入力してください。");
      return;
    }
    const payload = {
      user_id: userId,
      name,
      machine_type: machineType || null,
      purchase_date: purchaseDate || null,
      purchase_price: purchasePrice ? Number(purchasePrice) : null,
      memo,
      updated_at: new Date().toISOString(),
    };
    if (!editingId) {
      const usage = await getUsageLimits(supabase, userId);
      if (!usage.isPaid && usage.machines.used >= usage.machines.limit) {
        setLimitReached(true);
        return;
      }
    }
    if (editingId) {
      await supabase.from("machines").update(payload).eq("id", editingId).eq("user_id", userId);
    } else {
      await supabase.from("machines").insert(payload);
    }
    setEditingId("");
    setName("");
    setMachineType("");
    setPurchaseDate("");
    setPurchasePrice("");
    setMemo("");
    setError("");
    load();
  }

  async function remove(id: string) {
    await supabase.from("machines").delete().eq("id", id).eq("user_id", userId);
    load();
  }

  function edit(machine: Machine) {
    setEditingId(machine.id);
    setName(machine.name);
    setMachineType(machine.machine_type ?? "");
    setPurchaseDate(machine.purchase_date ?? "");
    setPurchasePrice(machine.purchase_price ? String(machine.purchase_price) : "");
    setMemo(machine.memo ?? "");
  }

  return (
    <AppShell title="機械を見る" subtitle="トラクターなどの機械を登録します。">
      <form onSubmit={save} className="space-y-4 rounded-2xl bg-white p-5 shadow-sm">
        <ErrorMessage message={error} />
        {limitReached ? <UpgradeNotice compact /> : null}
        <Field label="機械名"><input className={inputClass} value={name} onChange={(event) => setName(event.target.value)} required /></Field>
        <Field label="機械の種類">
          <select className={inputClass} value={machineType} onChange={(event) => setMachineType(event.target.value)}>
            <option value="">選んでください</option>
            {machineTypes.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
        </Field>
        <Field label="購入日"><input className={inputClass} type="date" value={purchaseDate} onChange={(event) => setPurchaseDate(event.target.value)} /></Field>
        <Field label="購入金額"><input className={inputClass} type="number" min="0" value={purchasePrice} onChange={(event) => setPurchasePrice(event.target.value)} /></Field>
        <Field label="メモ"><textarea className={inputClass} rows={3} value={memo} onChange={(event) => setMemo(event.target.value)} /></Field>
        <button className={buttonClass}>{editingId ? "機械を保存する" : "機械を追加する"}</button>
      </form>
      <div className="mt-6 space-y-3">
        {machines.map((machine) => (
          <div key={machine.id} className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-2xl font-bold">{machine.name}</p>
            <p className="mt-2 text-lg text-stone-700">{machine.machine_type || "種類未入力"} / {yen(machine.purchase_price)}</p>
            {machine.memo ? <p className="mt-2 text-lg leading-8 text-stone-700">{machine.memo}</p> : null}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button onClick={() => edit(machine)} className={subButtonClass}>編集</button>
              <button onClick={() => remove(machine.id)} className="w-full rounded-2xl border border-red-200 bg-white px-5 py-4 text-lg font-bold text-red-700">削除</button>
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}

export default function MachinesPage() {
  return <AuthGate>{(user) => <MachinesContent userId={user.id} />}</AuthGate>;
}
