import { NextResponse } from "next/server";
import { createAdminClient, createAuthClient } from "@/lib/supabase-server";
import { getStripe } from "@/lib/stripe-server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const authorization = request.headers.get("authorization");
    const accessToken = authorization?.startsWith("Bearer ")
      ? authorization.slice("Bearer ".length)
      : null;
    if (!accessToken) {
      return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
    }

    const authClient = createAuthClient(accessToken);
    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "ログイン情報を確認できませんでした。" }, { status: 401 });
    }

    const priceId = process.env.STRIPE_PRICE_ID;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!priceId || !appUrl) {
      return NextResponse.json(
        { error: "Stripe決済はまだ準備中です。手動申し込みをご利用ください。" },
        { status: 503 },
      );
    }

    const admin = createAdminClient();
    const { data: subscription } = await admin
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    const stripe = getStripe();
    let customerId = subscription?.stripe_customer_id as string | null | undefined;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;
      const { error: customerSaveError } = await admin.from("subscriptions").upsert(
        { user_id: user.id, stripe_customer_id: customerId, status: "free" },
        { onConflict: "user_id" },
      );
      if (customerSaveError) throw customerSaveError;
    }

    const baseUrl = appUrl.replace(/\/$/, "");
    const checkout = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: user.id,
      metadata: { user_id: user.id },
      subscription_data: { metadata: { user_id: user.id } },
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/subscribe/success`,
      cancel_url: `${baseUrl}/subscribe`,
    });

    if (!checkout.url) throw new Error("Stripe Checkout URL was not returned.");
    return NextResponse.json({ url: checkout.url });
  } catch (error) {
    console.error("Stripe checkout error", error);
    return NextResponse.json({ error: "Stripe決済の準備中に問題が起きました。" }, { status: 500 });
  }
}
