import type Stripe from "https://esm.sh/stripe@22.0.2";
import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, catalogEnvironment, isBillingEnabled, verifyWebhook } from "../_shared/stripe.ts";
import { provisionClient } from "../_shared/provisionClient.ts";
import { computeAccessPeriodEnd, mapSubscriptionStatus } from "../_shared/billingLogic.ts";

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

const now = () => new Date().toISOString();
const toIso = (seconds: unknown) =>
  typeof seconds === "number" ? new Date(seconds * 1000).toISOString() : null;

async function updateSubscriptionFromStripe(subscription: Stripe.Subscription, env: "test" | "production") {
  const item = subscription.items?.data?.[0];
  const periodStart = item?.current_period_start ?? subscription.current_period_start;
  const periodEnd = item?.current_period_end ?? subscription.current_period_end;
  const billingPeriod = item?.price?.recurring?.interval === "year" ? "anual" : "mensal";

  await getSupabase()
    .from("subscriptions")
    .update({
      status: mapSubscriptionStatus(subscription.status),
      billing_period: billingPeriod,
      stripe_customer_id: subscription.customer ?? null,
      stripe_product_id: item?.price?.product ?? null,
      stripe_price_id: item?.price?.id ?? null,
      current_period_start: toIso(periodStart),
      current_period_end: toIso(periodEnd),
      cancel_at_period_end: subscription.cancel_at_period_end ?? false,
      cancelled_at: subscription.canceled_at ? toIso(subscription.canceled_at) : null,
      environment: env,
    })
    .eq("stripe_subscription_id", subscription.id);
}

/** Fatura paga: reativa a assinatura e atualiza o período cobrado. */
async function handleInvoicePaid(invoice: Stripe.Invoice, env: "test" | "production") {
  const subscriptionId = invoice.subscription;
  if (!subscriptionId || typeof subscriptionId !== "string") return;
  const line = invoice.lines?.data?.[0];
  await getSupabase()
    .from("subscriptions")
    .update({
      status: "active",
      environment: env,
      current_period_start: toIso(line?.period?.start),
      current_period_end: toIso(line?.period?.end),
    })
    .eq("stripe_subscription_id", subscriptionId);
}

/** Fatura recusada: assinatura entra em atraso/expiração sem perder histórico. */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice, env: "test" | "production") {
  const subscriptionId = invoice.subscription;
  if (!subscriptionId || typeof subscriptionId !== "string") return;
  await getSupabase()
    .from("subscriptions")
    .update({ status: "expired", environment: env })
    .eq("stripe_subscription_id", subscriptionId);
}

/**
 * Reembolso: revoga o acesso.
 * - assinatura: status 'cancelled' (o ciclo já não vale mais);
 * - avulso (minicurso): 'expired', encerrando o prazo de 30 dias.
 */
async function handleRefund(
  refund: Stripe.Refund & { invoice?: string | null; subscription?: string | null },
  env: "test" | "production",
) {
  const paymentIntentId = typeof refund.payment_intent === "string" ? refund.payment_intent : null;
  const invoiceId = typeof refund.invoice === "string" ? refund.invoice : null;

  if (invoiceId) {
    // Assinatura reembolsada: invalida pela assinatura referenciada no reembolso.
    if (typeof refund.subscription === "string") {
      await getSupabase()
        .from("subscriptions")
        .update({ status: "cancelled", cancelled_at: now(), environment: env })
        .eq("stripe_subscription_id", refund.subscription);
      return;
    }
    console.log("refund de fatura sem subscription id:", invoiceId);
    return;
  }

  if (paymentIntentId) {
    // Compra avulsa (minicurso): encerra o prazo de acesso.
    await getSupabase()
      .from("subscriptions")
      .update({ status: "expired", environment: env })
      .eq("stripe_payment_intent_id", paymentIntentId);
  }
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

    // Idempotência com rastreabilidade: cada evento é registrado uma vez.
    // Um evento que falhou NÃO fica bloqueado: ele volta para 'pendente'
    // e é processado de novo quando o aviso é reenviado.
    const { error: insertError } = await getSupabase().from("payment_events").insert({
      event_id: event.id,
      event_type: event.type,
      environment: catalogEnv,
      payload: event as unknown as Record<string, unknown>,
      status: "pendente",
      received_at: now(),
      attempts: 0,
    });

    const isDuplicate = !!insertError &&
      (insertError.code === "23505" || (insertError.message ?? "").includes("duplicate key"));

    if (insertError && !isDuplicate) {
      console.error("payment_events insert failed:", insertError.code, insertError.message);
    }

    if (isDuplicate) {
      const { data: existingEvent } = await getSupabase()
        .from("payment_events")
        .select("status, attempts")
        .eq("event_id", event.id)
        .maybeSingle();

      const status = (existingEvent as { status?: string } | null)?.status;
      if (status !== "falha") {
        // Já processado, recusado ou em andamento: nada a repetir.
        return new Response(JSON.stringify({ received: true, duplicate: true, status: status ?? null }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      // Reprocessamento seguro de um evento que falhou: incrementa tentativas.
      await getSupabase()
        .from("payment_events")
        .update({
          status: "pendente",
          error: null,
          attempts: ((existingEvent as { attempts?: number } | null)?.attempts ?? 0) + 1,
        })
        .eq("event_id", event.id);
    }

    const finish = async (patch: Record<string, unknown>) => {
      await getSupabase().from("payment_events").update(patch).eq("event_id", event.id);
    };

    // Enquanto a homologação comercial não terminar, o evento é apenas registrado.
    if (!isBillingEnabled()) {
      await finish({ status: "ignorado", processed_at: now(), error: null });
      console.log("evento registrado sem efeito (cobrança desligada):", event.type);
      return new Response(JSON.stringify({ received: true, billing: "disabled" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      switch (event.type) {
        case "checkout.session.completed":
        case "checkout.session.async_payment_succeeded": {
          const session = event.data.object as Stripe.Checkout.Session;
          const billingPeriod: string = session.metadata?.billingPeriod ?? "mensal";
          const isOneTime = typeof session.subscription !== "string" || !session.subscription;

          if (session.payment_status === "paid") {
            const email = session.customer_details?.email ?? session.customer_email ?? "";
            if (!email) {
              console.error("checkout sem e-mail confirmado:", session.id);
              break;
            }
            const periodEnd = isOneTime
              ? computeAccessPeriodEnd({
                  billingPeriod,
                  createdSeconds: session.created ?? null,
                  subscriptionPeriodEndSeconds: null,
                })
              : null;
            await provisionClient({
              email,
              fullName: session.customer_details?.name ?? null,
              planCode: session.metadata?.planCode ?? null,
              billingPeriod,
              environment: catalogEnv,
              stripeCustomerId: typeof session.customer === "string" ? session.customer : null,
              stripeSubscriptionId: isOneTime ? null : (session.subscription as string),
              stripePaymentIntentId: isOneTime
                ? (typeof session.payment_intent === "string" ? session.payment_intent : null)
                : null,
              status: "active",
              currentPeriodStart: toIso(session.created ?? null),
              currentPeriodEnd: periodEnd,
            });
          } else if (session.payment_status === "unpaid") {
            // Pagamento assíncrono pendente (ex.: boleto/Pix em processamento):
            // provisiona em status 'trial' (aguardando compensação); o
            // async_payment_succeeded/failed conclui depois.
            const email = session.customer_details?.email ?? session.customer_email ?? "";
            if (email) {
              await provisionClient({
                email,
                fullName: session.customer_details?.name ?? null,
                planCode: session.metadata?.planCode ?? null,
                billingPeriod,
                environment: catalogEnv,
                status: "trial",
              });
            }
          }
          break;
        }
        case "checkout.session.async_payment_failed": {
          const session = event.data.object as Stripe.Checkout.Session;
          const email = session.customer_details?.email ?? session.customer_email ?? "";
          if (email) {
            await provisionClient({
              email,
              fullName: session.customer_details?.name ?? null,
              planCode: session.metadata?.planCode ?? null,
              environment: catalogEnv,
              status: "expired",
            });
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
            .update({ status: "cancelled", cancelled_at: now() })
            .eq("stripe_subscription_id", (event.data.object as any).id);
          break;
        case "invoice.paid":
          await handleInvoicePaid(event.data.object, catalogEnv);
          break;
        case "invoice.payment_failed":
          await handleInvoicePaymentFailed(event.data.object, catalogEnv);
          break;
        case "charge.refunded":
          await handleRefund(event.data.object, catalogEnv);
          break;
        default:
          console.log("evento não tratado:", event.type);
      }
    } catch (handlerError) {
      const err = handlerError as Error & { code?: string };
      // Conta interna: recusa definitiva e registrada; reenviar não resolve.
      if (err.code === "INTERNAL_ACCOUNT") {
        await finish({ status: "recusado", processed_at: now(), error: err.message });
        console.error("provisionamento recusado (conta interna):", event.id, err.message);
        return new Response(JSON.stringify({ received: true, refused: "internal_account" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      // Falha temporária: fica marcada como falha, com o erro, para investigação
      // e reprocessamento quando o aviso for reenviado.
      await finish({ status: "falha", error: err.message });
      console.error("falha ao processar evento:", event.id, err.message);
      return new Response("Webhook processing error", { status: 500 });
    }

    await finish({ status: "processado", processed_at: now(), error: null });

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("webhook error:", (e as Error).message);
    return new Response("Webhook error", { status: 400 });
  }
});
