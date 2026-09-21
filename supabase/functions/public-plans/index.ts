import { createClient } from "npm:@supabase/supabase-js@2";
import { isBillingEnabled } from "../_shared/stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Leitura pública do catálogo comercial.
 * Devolve SOMENTE planos ativos do ambiente pedido e apenas campos comerciais.
 * Nunca devolve identificadores do provedor de pagamento nem dados de cliente.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const url = new URL(req.url);
    const rawEnv = url.searchParams.get("env");
    const environment = rawEnv === "production" ? "production" : "test";

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data, error } = await supabase
      .from("subscription_plans")
      .select("code, name, description, features, billing_period, amount_cents, currency, is_recommended, sort_order")
      .eq("is_active", true)
      .eq("environment", environment)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("public-plans query failed:", error.code ?? "", error.message ?? "");
      return json({ error: "Não foi possível carregar os planos." }, 500);
    }

    const billingReady = isBillingEnabled();

    return json({ plans: data ?? [], billingReady, environment });
  } catch (e) {
    console.error("public-plans error:", (e as Error).message);
    return json({ error: "Não foi possível carregar os planos." }, 500);
  }
});
