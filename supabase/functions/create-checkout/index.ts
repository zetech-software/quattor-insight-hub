import { createClient } from "npm:@supabase/supabase-js@2";
import {
  type StripeEnv,
  catalogEnvironment,
  createStripeClient,
  isBillingEnabled,
} from "../_shared/stripe.ts";
import {
  MINICURSO_ACCESS_DAYS,
  isAllowedReturnUrl,
  parseAllowedOrigins,
  resolveCheckoutMode,
} from "../_shared/billingLogic.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Checkout preparado, comercialmente desligado.
 * O navegador envia apenas o código interno do plano; preço, produto, ambiente,
 * modo (avulso x assinatura) e URL de retorno autorizada vêm sempre do servidor.
 * A chave do provedor nunca sai daqui.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const body = await req.json().catch(() => ({}));
    const planCode = typeof body.planCode === "string" ? body.planCode : "";
    const rawEnv = body.environment === "live" ? "live" : "sandbox";
    const environment: StripeEnv = rawEnv;
    const returnUrl = typeof body.returnUrl === "string" ? body.returnUrl : "";

    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(planCode)) {
      return json({ error: "Plano inválido." }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: plan, error } = await supabase
      .from("subscription_plans")
      .select("code, name, stripe_price_id, environment, is_active, billing_period")
      .eq("code", planCode)
      .maybeSingle();

    if (error) {
      console.error("plan lookup failed:", error.code ?? "", error.message ?? "");
      return json({ error: "Não foi possível validar o plano." }, 500);
    }
    if (!plan || !plan.is_active) {
      return json({ error: "Plano indisponível." }, 404);
    }
    if (plan.environment !== catalogEnvironment(environment)) {
      return json({ error: "Plano indisponível neste ambiente." }, 409);
    }

    if (!isBillingEnabled()) {
      return json(
        {
          error: "Cobrança ainda não homologada.",
          reason: "billing_disabled",
        },
        503,
      );
    }

    if (!plan.stripe_price_id) {
      return json({ error: "Plano sem preço configurado." }, 409);
    }

    // URL de retorno: apenas origens autorizadas no servidor.
    const allowedOrigins = parseAllowedOrigins(Deno.env.get("ALLOWED_RETURN_ORIGINS"));
    if (!isAllowedReturnUrl(returnUrl, allowedOrigins)) {
      return json({ error: "Endereço de retorno não autorizado." }, 400);
    }

    const mode = resolveCheckoutMode(plan.billing_period);

    const stripe = createStripeClient(environment);
    const session = await stripe.checkout.sessions.create({
      line_items: [{ price: plan.stripe_price_id, quantity: 1 }],
      mode,
      ui_mode: "embedded_page",
      return_url: returnUrl,
      ...(mode === "subscription"
        ? { subscription_data: { metadata: { planCode: plan.code } } }
        : {}),
      metadata: {
        planCode: plan.code,
        billingPeriod: plan.billing_period ?? "mensal",
        // Para planos avulsos (minicurso), o webhook usa este prazo.
        ...(mode === "payment" ? { accessDays: String(MINICURSO_ACCESS_DAYS) } : {}),
      },
    });

    return json({ clientSecret: session.client_secret });
  } catch (e) {
    console.error("create-checkout error:", (e as Error).message);
    return json({ error: "Não foi possível iniciar o pagamento." }, 500);
  }
});
