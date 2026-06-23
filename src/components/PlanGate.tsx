"use client";

import { useEffect, useState } from "react";
import { getCurrentSubscription, isPaidSubscription } from "@/lib/subscription";
import { supabase } from "@/lib/supabase";
import { UpgradeNotice } from "@/components/UpgradeNotice";

export function PlanGate({
  userId,
  children,
}: {
  userId: string;
  children: React.ReactNode;
}) {
  const [loading, setLoading] = useState(true);
  const [isPaid, setIsPaid] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const subscription = await getCurrentSubscription(supabase, userId);
      if (!cancelled) {
        setIsPaid(isPaidSubscription(subscription));
        setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (loading) {
    return <div className="rounded-2xl bg-white p-6 text-lg font-bold text-stone-700 shadow-sm">プランを確認中です。</div>;
  }

  return isPaid ? <>{children}</> : <UpgradeNotice />;
}
