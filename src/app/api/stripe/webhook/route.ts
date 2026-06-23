import type Stripe from "stripe";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";
import { getStripe } from "@/lib/stripe-server";

export const runtime = "nodejs";

type SubscriptionRecord = {
  user_id: string;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  status: string;
  price_id?: string | null;
  current_period_end?: string | null;
};

function asId(value: string | { id: string } | null) {
  return typeof value === "string" ? value : value?.id ?? null;
}

function periodEnd(subscription: Stripe.Subscription) {
  const timestamp = subscription.items.data.reduce(
    (latest, item) => Math.max(latest, item.current_period_end ?? 0),
    0,
  );
  return timestamp ? new Date(timestamp * 1000).toISOString() : null;
}

async function userIdForSubscription(
  admin: ReturnType<typeof createAdminClient>,
  subscription: Stripe.Subscription,
) {
  const metadataUserId = subscription.metadata.user_id;
  if (metadataUserId) return metadataUserId;
  const customerId = asId(subscription.customer);
  if (!customerId) return null;
  const { data } = await admin
    .from("subscriptions")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  return data?.user_id ?? null;
}

async function upsertStripeSubscription(
  admin: ReturnType<typeof createAdminClient>,
  subscription: Stripe.Subscription,
  statusOverride?: string,
) {
  const userId = await userIdForSubscription(admin, subscription);
  if (!userId) return;
  const record: SubscriptionRecord = {
    user_id: userId,
    stripe_customer_id: asId(subscription.customer),
    stripe_subscription_id: subscription.id,
    status: statusOverride ?? subscription.status,
    price_id: subscription.items.data[0]?.price.id ?? null,
    current_period_end: periodEnd(subscription),
  };
  const { error } = await admin.from("subscriptions").upsert(record, { onConflict: "user_id" });
  if (error) throw error;
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Webhookの署名を確認できません。" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(await request.text(), signature, webhookSecret);
  } catch (error) {
    console.error("Stripe webhook signature error", error);
    return NextResponse.json({ error: "Webhookの署名が正しくありません。" }, { status: 400 });
  }

  try {
    const admin = createAdminClient();
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id ?? session.metadata?.user_id;
        const customerId = asId(session.customer);
        const subscriptionId = asId(session.subscription);
        if (userId) {
          const { error } = await admin.from("subscriptions").upsert(
            {
              user_id: userId,
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
              status: "active",
            },
            { onConflict: "user_id" },
          );
          if (error) throw error;
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await upsertStripeSubscription(admin, event.data.object as Stripe.Subscription);
        break;
      case "customer.subscription.deleted":
        await upsertStripeSubscription(admin, event.data.object as Stripe.Subscription, "canceled");
        break;
      case "invoice.paid":
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = asId(invoice.parent?.subscription_details?.subscription ?? null);
        if (subscriptionId) {
          const { error } = await admin
            .from("subscriptions")
            .update({ status: event.type === "invoice.paid" ? "active" : "past_due" })
            .eq("stripe_subscription_id", subscriptionId);
          if (error) throw error;
        }
        break;
      }
      default:
        break;
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook processing error", error);
    return NextResponse.json({ error: "Webhook処理に失敗しました。" }, { status: 500 });
  }
}
