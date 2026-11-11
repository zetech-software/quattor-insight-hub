import { adminClient, assertNotInternalAccount } from "../_shared/provisionClient.ts";
import {
  allowedCheckoutReturnUrl, billingEnvironment, canProcessBilling, catalogEnvironment,
  createStripeClient, type Stripe,
} from "../_shared/stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: corsHeaders });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);

  const environment = billingEnvironment();
  if (!canProcessBilling(environment)) {
    return json({ error: "Cobrança ainda não homologada.", reason: "billing_disabled" }, 503);
  }

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body.planCode !== "string" || !/^[a-zA-Z0-9_-]{1,64}$/.test(body.planCode)) {
      return json({ error: "Plano inválido." }, 400);
    }
    if (body.environment !== undefined && body.environment !== environment) {
      return json({ error: "Ambiente indisponível." }, 409);
    }
    const returnUrl = allowedCheckoutReturnUrl(body.returnUrl);
    if (!returnUrl) return json({ error: "Endereço de retorno inválido." }, 400);
    const requestId = body.requestId;
    if (typeof requestId !== "string" || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(requestId)) {
      return json({ error: "Identificador de tentativa inválido." }, 400);
    }

    const token = req.headers.get("Authorization")?.match(/^Bearer (\S+)$/i)?.[1];
    if (!token) return json({ error: "Entre na sua conta para continuar." }, 401);
    const supabase = adminClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user?.email || !user.email_confirmed_at) {
      return json({ error: "Confirme seu e-mail para continuar." }, 401);
    }
    const roles = await assertNotInternalAccount(supabase, user.id);
    if (!roles.includes("client")) return json({ error: "Conta indisponível." }, 403);
    const { data: profile, error: profileError } = await supabase.from("profiles")
      .select("is_active").eq("user_id", user.id).maybeSingle();
    if (profileError) throw profileError;
    if (!profile?.is_active) return json({ error: "Conta indisponível." }, 403);

    const { data: plan, error } = await supabase.from("subscription_plans")
      .select("code, stripe_price_id, stripe_product_id, checkout_mode, billing_period, amount_cents, currency")
      .eq("environment", catalogEnvironment(environment)).eq("code", body.planCode)
      .eq("is_active", true).maybeSingle();
    if (error) throw error;
    if (!plan?.stripe_price_id || !plan.stripe_product_id
      || !Number.isSafeInteger(plan.amount_cents) || plan.amount_cents <= 0) {
      return json({ error: "Plano indisponível." }, 404);
    }

    const stripe = createStripeClient(environment);
    const price = await stripe.prices.retrieve(plan.stripe_price_id);
    const mode = plan.checkout_mode === "payment" ? "payment" : "subscription";
    const productId = typeof price.product === "string" ? price.product : price.product.id;
    const interval = plan.billing_period === "anual" ? "year" : "month";
    if (price.livemode !== (environment === "live") || !price.active || productId !== plan.stripe_product_id
      || price.currency !== plan.currency.toLowerCase()
      || price.unit_amount !== plan.amount_cents
      || (mode === "payment" ? price.type !== "one_time"
        : price.type !== "recurring" || price.recurring?.interval !== interval
          || price.recurring?.interval_count !== 1)) {
      return json({ error: "Preço incompatível com o catálogo." }, 409);
    }

    const metadata = { integration: "quattor", planCode: plan.code, userId: user.id };
    const hosted = body.hosted === true;
    returnUrl.searchParams.delete("checkout");
    const baseUrl = returnUrl.toString();
    const appendStatus = (status: string) => {
      const url = new URL(baseUrl);
      url.searchParams.set("checkout", status);
      return url.toString();
    };
    const presentation: Stripe.Checkout.SessionCreateParams = hosted
      ? { success_url: appendStatus("return"), cancel_url: appendStatus("cancelled") }
      : { ui_mode: "embedded_page", return_url: appendStatus("return") };
    const session = await stripe.checkout.sessions.create({
      ...presentation,
      line_items: [{ price: price.id, quantity: 1 }],
      mode,
      client_reference_id: user.id,
      customer_email: user.email,
      metadata,
      ...(mode === "subscription" ? { subscription_data: { metadata } } : {}),
    }, { idempotencyKey: `quattor:${environment}:${user.id}:${plan.code}:${requestId}` });
    if (session.livemode !== (environment === "live")) throw new Error("Unexpected Stripe mode");

    return json(hosted ? { checkoutUrl: session.url } : { clientSecret: session.client_secret });
  } catch (error) {
    if ((error as { code?: string }).code === "INTERNAL_ACCOUNT") {
      return json({ error: "Conta interna indisponível para contratação." }, 403);
    }
    console.error("create-checkout failed", (error as { code?: string }).code ?? "unexpected");
    return json({ error: "Não foi possível iniciar o pagamento." }, 500);
  }
});
