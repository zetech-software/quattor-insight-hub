import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, catalogEnvironment, isBillingEnabled, verifyWebhook } from "../_shared/stripe.ts";
import { provisionClient } from "../_shared/provisionClient.ts";

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
  }
  return _supabase;
}

const toIso = (seconds: unknown) =>
  typeof seconds === "number" ? new Date(seconds * 1000).toISOString() : null;

async function updateSubscriptionFromStripe(subscription: any, env: "test" | "production") {
  const item = subscription.items?.data?.[0];
  const periodStart = item?.current_period_start ?? subscription.current_period_start;
  const periodEnd = item?.current_period_end ?? subscription.current_period_end;

  const statusMap: Record<string, string> = {
    trialing: "trial",
    active: "active",
    past_due: "active",
    canceled: "cancelled",
    unpaid: "expired",
    incomplete: "trial",
    incomplete_expired: "expired",
    paused: "expired",
  };

  await getSupabase()
    .from("subscriptions")
    .update({
      status: statusMap[subscription.status] ?? "active",
      billing_period: item?.price?.recurring?.interval === "year" ? "anual" : "mensal",
      stripe_customer_id: subscription.customer ?? null,
      stripe_product_id: item?.price?.product ?? null,
      stripe_price_id: item?.price?.lookup_key ?? item?.price?.id ?? null,
      current_period_start: toIso(periodStart),
      current_period_end: toIso(periodEnd),
      cancel_at_period_end: subscription.cancel_at_period_end ?? false,
      cancelled_at: subscription.canceled_at ? toIso(subscription.canceled_at) : null,
      environment: env,
    })
    .eq("stripe_subscription_id", subscription.id);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const rawEnv = new URL(req.url).searchParams.get("env");
  if (rawEnv !== "sandbox" && rawEnv !== "live") {
    console.error("webhook com env inválido:", rawEnv);
    return new Response(JSON.stringify({ received: true, ignored: "invalid env" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
  const env: StripeEnv = rawEnv;
  const catalogEnv = catalogEnvironment(env);

  try {
    const event = await verifyWebhook(req, env);

    // Teste e produção nunca se misturam.
    const eventIsLive = event.livemode === true;
    if (eventIsLive !== (env === "live")) {
      console.error("webhook de ambiente divergente:", event.id, event.livemode);
      return new Response(JSON.stringify({ received: true, ignored: "env mismatch" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Idempotência: o mesmo evento nunca é processado duas vezes.
    const { error: insertError } = await getSupabase().from("payment_events").insert({
      event_id: event.id,
      event_type: event.type,
      environment: catalogEnv,
      payload: event as unknown as Record<string, unknown>,
    });

    if (insertError) {
      if (insertError.code === "23505" || insertError.code === "23514" || insertError.code === "23503") {
        console.error("payment_events insert error:", insertError.code, insertError.message);
      }
      if (insertError.code === "23505") {
        // duplicado
        return new Response(JSON.stringify({ received: true, duplicate: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (insertError.code === "23000" || insertError.code === "23514") {
        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (insertError.message?.includes("duplicate key")) {
        return new Response(JSON.stringify({ received: true, duplicate: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      console.error("payment_events insert failed:", insertError.message);
    }

    // Enquanto a homologação comercial não terminar, o evento é apenas registrado.
    if (!isBillingEnabled()) {
      await getSupabase()
        .from("payment_events")
        .update({ processed_at: new Date().toISOString() })
        .eq("event_id", event.id);
      console.log("evento registrado sem efeito (cobrança desligada):", event.type);
      return new Response(JSON.stringify({ received: true, billing: "disabled" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session: any = event.data.object;
        if (session.payment_status !== "unpaid") {
          const email = session.customer_details?.email ?? session.customer_email ?? "";
          if (email) {
            await provisionClient({
              email,
              fullName: session.customer_details?.name ?? null,
              planCode: session.metadata?.planCode ?? null,
              environment: catalogEnv,
              stripeCustomerId: typeof session.customer === "string" ? session.customer : null,
              stripeSubscriptionId: typeof session.subscription === "string" ? session.subscription : null,
              status: "active",
            });
          } else {
            console.error("checkout sem e-mail confirmado:", session.id);
          }
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await updateSubscriptionFromStripe(event.data.object, catalogEnv);
        break;
      case "customer.subscription.deleted":
        await getSupabase()
          .from("subscriptions")
          .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
          .eq("stripe_subscription_id", (event.data.object as any).id);
        break;
      case "invoice.paid":
      case "invoice.payment_failed":
      case "checkout.session.async_payment_failed":
        console.log("evento de fatura registrado:", event.type);
        break;
      default:
        console.log("evento não tratado:", event.type);
    }

    await getSupabase()
      .from("payment_events")
      .update({ processed_at: new Date().toISOString() })
      .eq("event_id", event.id);

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("webhook error:", (e as Error).message);
    return new Response("Webhook error", { status: 400 });
  }
});
