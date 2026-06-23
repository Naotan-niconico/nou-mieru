import type { SupabaseClient } from "@supabase/supabase-js";
import { currentMonthRange } from "@/lib/format";

export type Subscription = {
  id: string;
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  status: string | null;
  price_id: string | null;
  current_period_end: string | null;
};

export const FREE_LIMITS = {
  crops: 1,
  machines: 1,
  monthlySales: 5,
  monthlyExpenses: 5,
} as const;

export function isPaidStatus(status?: string | null) {
  return status === "active" || status === "trialing";
}

export function isPaidSubscription(subscription?: Subscription | null) {
  if (!subscription) return false;
  if (isPaidStatus(subscription.status)) return true;
  return Boolean(
    subscription.current_period_end &&
      new Date(subscription.current_period_end).getTime() > Date.now(),
  );
}

export async function getCurrentSubscription(
  client: SupabaseClient,
  userId: string,
): Promise<Subscription | null> {
  const { data } = await client
    .from("subscriptions")
    .select("id,user_id,stripe_customer_id,stripe_subscription_id,status,price_id,current_period_end")
    .eq("user_id", userId)
    .maybeSingle();

  return (data as Subscription | null) ?? null;
}

export async function getUsageLimits(client: SupabaseClient, userId: string) {
  const { start, end } = currentMonthRange();
  const [subscription, crops, machines, sales, expenses] = await Promise.all([
    getCurrentSubscription(client, userId),
    client.from("crops").select("id", { count: "exact", head: true }).eq("user_id", userId),
    client.from("machines").select("id", { count: "exact", head: true }).eq("user_id", userId),
    client
      .from("sales")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("sale_date", start)
      .lt("sale_date", end),
    client
      .from("expenses")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("expense_date", start)
      .lt("expense_date", end),
  ]);

  const isPaid = isPaidSubscription(subscription);
  return {
    subscription,
    isPaid,
    crops: { used: crops.count ?? 0, limit: FREE_LIMITS.crops },
    machines: { used: machines.count ?? 0, limit: FREE_LIMITS.machines },
    monthlySales: { used: sales.count ?? 0, limit: FREE_LIMITS.monthlySales },
    monthlyExpenses: { used: expenses.count ?? 0, limit: FREE_LIMITS.monthlyExpenses },
  };
}
