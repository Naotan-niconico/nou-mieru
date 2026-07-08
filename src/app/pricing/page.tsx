"use client";

import { useState } from "react";
import { AuthGate } from "@/components/AuthGate";
import { supabase } from "@/lib/supabase";

export default function PricingPage() {
  return (
    <AuthGate requireSetup={false}>
      {() => <PricingContent />}
    </AuthGate>
  );
}

function PricingContent() {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function startCheckout() {
    setLoading(true);
    setErrorMessage("");

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const accessToken = session?.access_token;
    if (!accessToken) {
      setErrorMessage("ログインし直してから、もう一度お試しください。");
      setLoading(false);
      return;
    }

    const response = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const data = (await response.json()) as { url?: string; error?: string };
    if (!response.ok || !data.url) {
      setErrorMessage(data.error ?? "決済ページを作成できませんでした。");
      setLoading(false);
      return;
    }

    window.location.href = data.url;
  }

  return (
    <main className="min-h-screen bg-[#f6faf5] px-5 py-8 text-green-950">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm font-bold text-green-700">農見える 料金プラン</p>
        <h1 className="mt-2 text-3xl font-black leading-tight">まずは小さく、月額500円で。</h1>
        <p className="mt-4 text-base leading-8 text-green-900">
          売上、経費、作物、機械、レシートをスマホやPCから記録できる、農家さん向けの小さな管理アプリです。
          まだ育成中のサービスなので、初期プランはシンプルな月額制にしています。
        </p>

        <section className="mt-8 rounded-3xl border border-green-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-black">月額プラン</h2>
              <p className="mt-2 text-green-800">農見えるの基本機能を使えるプラン</p>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-4xl font-black">500円</p>
              <p className="text-sm font-bold text-green-700">税込 / 月</p>
            </div>
          </div>

          <ul className="mt-6 space-y-3 text-green-900">
            <li>✅ 売上・経費の記録</li>
            <li>✅ 作物ごとの管理</li>
            <li>✅ 機械・修理履歴の管理</li>
            <li>✅ レシート画像の保存</li>
            <li>✅ 月ごとの集計確認</li>
          </ul>

          {errorMessage ? (
            <p className="mt-5 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">{errorMessage}</p>
          ) : null}

          <button
            onClick={startCheckout}
            disabled={loading}
            className="mt-7 w-full rounded-2xl bg-green-700 px-5 py-4 text-lg font-black text-white shadow-sm transition hover:bg-green-800 disabled:cursor-not-allowed disabled:bg-green-300"
          >
            {loading ? "決済ページを作成中です" : "Stripeで申し込む"}
          </button>

          <p className="mt-4 text-sm leading-7 text-green-700">
            決済はStripe Checkoutで安全に処理されます。カード情報は農見える側には保存されません。
          </p>
        </section>

        <section className="mt-6 rounded-3xl border border-dashed border-green-300 bg-green-50 p-6">
          <h2 className="text-xl font-black">JPYC決済について</h2>
          <p className="mt-3 leading-8 text-green-900">
            JPYC決済は準備中です。法律・本人確認・送金確認・返金対応の設計が必要なので、まずはStripe決済を安定稼働させ、
            その後にJPYCの安全な受付方法を追加します。
          </p>
        </section>
      </div>
    </main>
  );
}
