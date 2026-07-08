import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createAuthClient } from "@/lib/supabase-server";
import { getStripe } from "@/lib/stripe-server";

export const runtime = "nodejs";

const DEFAULT_PRICE_ID = "price_1TqpIePhhH7pW5iKJUgfXuq3";

function getBaseUrl(request: NextRequest) {
  return process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
}

function getAccessToken(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.toLowerCase().startsWith("bearer ")) return null;
  return authorization.slice("bearer ".length).trim();
}

export async function POST(request: NextRequest) {
  const accessToken = getAccessToken(request);
  if (!accessToken) {
    return NextResponse.json({ error: "ログイン情報を確認できません。" }, { status: 401 });
  }

  const authClient = createAuthClient(accessToken);
  const {
    data: { user },
    error: userError,
  } = await authClient.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  }

  const stripe = getStripe();
  const admin = createAdminClient();
  const priceId = process.env.STRIPE_PRICE_ID || DEFAULT_PRICE_ID;
  const baseUrl = getBaseUrl(request);

  const { data: existingSubscription, error: subscriptionError } = await admin
    .from("subscriptions")
    .select("stripe_customer_id,stripe_subscription_id,status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (subscriptionError) {
    console.error("Subscription lookup failed", subscriptionError);
    return NextResponse.json({ error: "契約状況の確認に失敗しました。" }, { status: 500 });
  }

  let customerId = existingSubscription?.stripe_customer_id ?? null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: { user_id: user.id, service: "nou-mieru" },
    });
    customerId = customer.id;

    const { error } = await admin.from("subscriptions").upsert(
      {
        user_id: user.id,
        stripe_customer_id: customerId,
        status: existingSubscription?.status ?? "free",
      },
      { onConflict: "user_id" },
    );

    if (error) {
      console.error("Subscription customer upsert failed", error);
      return NextResponse.json({ error: "顧客情報の保存に失敗しました。" }, { status: 500 });
    }
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: user.id,
    line_items: [{ price: priceId, quantity: 1 }],
    allow_promotion_codes: true,
    success_url: `${baseUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/pricing`,
    metadata: { user_id: user.id, service: "nou-mieru" },
    subscription_data: { metadata: { user_id: user.id, service: "nou-mieru" } },
  });

  if (!session.url) {
    return NextResponse.json({ error: "決済ページを作成できませんでした。" }, { status: 500 });
  }

  return NextResponse.json({ url: session.url });
}
