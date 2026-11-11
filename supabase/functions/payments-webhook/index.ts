import {
  canProcessBilling, catalogEnvironment, createStripeClient,
  type Stripe, verifyWebhook,
} from "../_shared/stripe.ts";
import { adminClient, assertNotInternalAccount } from "../_shared/provisionClient.ts";

const idOf = (object: string | { id: string } | null | undefined) =>
  typeof object === "string" ? object : object?.id ?? null;

type ContractTarget = { id: string; mode: "payment" | "subscription" };

function contractTarget(event: Stripe.Event): ContractTarget | null {
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
    case "checkout.session.async_payment_failed":
    case "checkout.session.expired": {
      const session = event.data.object;
      if (session.mode === "payment") return { id: session.id, mode: "payment" };
      const id = idOf(session.subscription);
      return id ? { id, mode: "subscription" } : null;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
    case "customer.subscription.paused":
    case "customer.subscription.resumed":
      return { id: event.data.object.id, mode: "subscription" };
    case "invoice.paid":
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice & { subscription?: string };
      const id = idOf(invoice.parent?.subscription_details?.subscription ?? invoice.subscription);
      return id ? { id, mode: "subscription" } : null;
    }
    default:
      return null;
  }
}

type Database = ReturnType<typeof adminClient>;
type CatalogEnv = ReturnType<typeof catalogEnvironment>;

async function reconcile(db: Database, stripe: Stripe, environment: CatalogEnv, target: ContractTarget) {
  const live = environment === "production";
  let metadata: Stripe.Metadata | null;
  let customerId: string | null;
  let price: Stripe.Price | null;
  let status: string;
  let accessUntil: number | null = null;
  let cancelAtPeriodEnd = false;

  if (target.mode === "payment") {
    const session = await stripe.checkout.sessions.retrieve(target.id, { expand: ["line_items"] });
    if (session.livemode !== live || session.mode !== "payment") throw new Error("Checkout mode mismatch");
    metadata = session.metadata;
    if (metadata?.integration !== "quattor" || session.client_reference_id !== metadata.userId) return null;
    customerId = idOf(session.customer);
    const items = session.line_items;
    if (items?.has_more || items?.data.length !== 1 || items.data[0].quantity !== 1) {
      throw new Error("Unexpected Checkout items");
    }
    price = items.data[0].price ?? null;
    // Unpaid, expired and async-failed sessions confer no entitlement.
    if (session.status !== "complete" || session.payment_status !== "paid") return null;
    status = "paid";
  } else {
    const sub = await stripe.subscriptions.retrieve(target.id, { expand: ["latest_invoice"] });
    if (sub.livemode !== live) throw new Error("Subscription mode mismatch");
    metadata = sub.metadata;
    if (metadata.integration !== "quattor") {
      const { data: legacy, error } = await db.from("subscriptions")
        .select("user_id, plan_code").eq("stripe_subscription_id", sub.id)
        .eq("environment", environment).maybeSingle();
      if (error) throw error;
      if (!legacy?.plan_code) return null;
      metadata = { userId: legacy.user_id, planCode: legacy.plan_code };
    }
    if (sub.items.has_more || sub.items.data.length !== 1) throw new Error("Unexpected subscription items");
    const item = sub.items.data[0];
    const invoice = typeof sub.latest_invoice === "object" ? sub.latest_invoice : null;
    customerId = idOf(sub.customer);
    price = item.price;
    status = sub.status;
    cancelAtPeriodEnd = sub.cancel_at_period_end;
    if (sub.pause_collection) {
      status = "paused";
    } else if (status === "active" && invoice?.status !== "paid") {
      status = invoice?.attempted ? "past_due" : "awaiting_payment";
    }
    if (status === "active") accessUntil = item.current_period_end;
    if (status === "trialing") accessUntil = Math.min(item.current_period_end, sub.trial_end ?? 0);
    if (accessUntil !== null && sub.cancel_at !== null) accessUntil = Math.min(accessUntil, sub.cancel_at);
  }

  const userId = metadata?.userId;
  const planCode = metadata?.planCode;
  if (!userId || !planCode || !price || price.livemode !== live) throw new Error("Invalid Stripe contract");
  await assertNotInternalAccount(db, userId);

  const productId = idOf(price.product);
  const { data: existing, error: existingError } = await db.from("stripe_contracts")
    .select("user_id, plan_code, mode, price_id, product_id").eq("environment", environment)
    .eq("object_id", target.id).maybeSingle();
  if (existingError) throw existingError;
  if (!existing) {
    const { data: plan, error } = await db.from("subscription_plans")
      .select("stripe_price_id, stripe_product_id, checkout_mode").eq("environment", environment)
      .eq("code", planCode).maybeSingle();
    if (error) throw error;
    if (plan?.stripe_price_id !== price.id || plan?.stripe_product_id !== productId
      || plan?.checkout_mode !== target.mode) throw new Error("Stripe catalog mismatch");
  }
  return {
    user_id: userId, plan_code: planCode, mode: target.mode, customer_id: customerId,
    price_id: price.id, product_id: productId, status, cancel_at_period_end: cancelAtPeriodEnd,
    access_until: accessUntil ? new Date(accessUntil * 1000).toISOString() : null,
  };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const env = new URL(req.url).searchParams.get("env");
  if (env !== "sandbox" && env !== "live") return new Response("Invalid environment", { status: 400 });

  let event: Stripe.Event;
  try {
    event = await verifyWebhook(req, env);
  } catch {
    return new Response("Invalid Stripe signature", { status: 400 });
  }
  if (event.livemode !== (env === "live")) return new Response("Stripe mode mismatch", { status: 400 });

  const target = contractTarget(event);
  if (!target) return Response.json({ received: true });
  if (!canProcessBilling(env)) return new Response("Billing disabled", { status: 503 });

  const db = adminClient();
  const environment = catalogEnvironment(env);
  const identity = { p_environment: environment, p_object_id: target.id, p_event_id: event.id };
  try {
    const { data: token, error } = await db.rpc("claim_stripe_event", {
      ...identity, p_event_type: event.type,
    });
    if (error || !token) throw error ?? new Error("Missing lease token");
    if (token === "duplicate") return Response.json({ received: true, duplicate: true });
    if (token === "busy") return new Response("Retry Stripe event", { status: 503 });

    let contract;
    let refused = false;
    try {
      contract = await reconcile(db, createStripeClient(env), environment, target);
    } catch (error) {
      refused = (error as { code?: string }).code === "INTERNAL_ACCOUNT";
      if (!refused) {
        const { error: finishError } = await db.rpc("finish_stripe_event", {
          ...identity, p_token: token, p_status: "falha", p_error: "stripe_reconciliation_failed",
        });
        if (finishError) throw finishError;
        throw error;
      }
    }
    const { error: finishError } = await db.rpc("finish_stripe_event", {
      ...identity, p_token: token, p_status: refused ? "recusado" : "processado",
      p_error: refused ? "internal_account" : null, p_contract: contract ?? null,
    });
    if (finishError) throw finishError;
    return Response.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook failed", event.id, event.type, (error as { code?: string }).code ?? "unexpected");
    return new Response("Webhook processing error", { status: 500 });
  }
});
