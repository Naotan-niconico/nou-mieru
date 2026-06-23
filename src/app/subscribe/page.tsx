"use client";

import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { AuthGate } from "@/components/AuthGate";
import { ErrorMessage } from "@/components/FormParts";
import { getCurrentSubscription, isPaidSubscription } from "@/lib/subscription";
import { supabase } from "@/lib/supabase";

const contactEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "naotanmaru9world@gmail.com";

function SubscribeContent({ userId }: { userId: string }) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function startCheckout() {
    setError("");
    setLoading(true);
    try {
      const subscription = await getCurrentSubscription(supabase, userId);
      if (isPaidSubscription(subscription)) {
        setError("すでに有料プランをご利用中です。");
        return;
      }

      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      if (!token) {
        setError("ログインし直してからお試しください。");
        return;
      }

      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !payload.url) {
        setError(payload.error || "Stripeの決済画面を開けませんでした。手動申し込みをご利用ください。");
        return;
      }
      window.location.assign(payload.url);
    } catch {
      setError("Stripeの決済画面を開けませんでした。手動申し込みをご利用ください。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell title="有料プラン" subtitle="売上・経費をもっとたくさん記録したい方向けのプランです。">
      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-3xl font-bold text-green-900">農みえる 有料プラン</h2>
        <p className="mt-4 text-3xl font-bold">月額 500円（税込想定）</p>
        <h3 className="mt-7 text-2xl font-bold">有料プランでできること</h3>
        <ul className="mt-4 space-y-3 text-lg leading-8">
          <li>売上・経費を無制限登録</li>
          <li>作物・機械を無制限登録</li>
          <li>レシート画像の確認</li>
          <li>月別レポートのすべてを確認</li>
          <li>今後の分析機能</li>
        </ul>
        <p className="mt-7 text-lg leading-8 text-stone-700">
          現在はテスト運用中です。Stripe決済、または手動承認でご利用いただけます。
        </p>
        <div className="mt-5 space-y-3">
          <ErrorMessage message={error} />
          <button
            onClick={startCheckout}
            disabled={loading}
            className="w-full rounded-2xl bg-green-700 px-5 py-5 text-xl font-bold text-white hover:bg-green-800 disabled:bg-stone-300"
          >
            {loading ? "決済画面を開いています" : "Stripeで登録する"}
          </button>
          <a
            href={`mailto:${contactEmail}?subject=${encodeURIComponent("農みえる有料プラン申し込み")}`}
            className="block w-full rounded-2xl border border-green-200 bg-white px-5 py-5 text-center text-xl font-bold text-green-900 hover:bg-green-50"
          >
            手動で申し込む
          </a>
        </div>
      </section>
    </AppShell>
  );
}

export default function SubscribePage() {
  return <AuthGate>{(user) => <SubscribeContent userId={user.id} />}</AuthGate>;
}
