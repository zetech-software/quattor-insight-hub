import { AccessError, requireOperationalUser } from "../_shared/access.ts";
import { isBillingEnabled } from "../_shared/stripe.ts";
import { provisionClient } from "../_shared/provisionClient.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Provisionamento de cliente a partir de uma assinatura confirmada.
 * Preparado e desligado: só executa com a cobrança homologada e apenas
 * a pedido do Dono. O fluxo automático entra pelo recebimento do aviso
 * de pagamento, nunca pelo navegador.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    await requireOperationalUser(req, ["admin"]);

    if (!isBillingEnabled()) {
      return json({ error: "Cobrança ainda não homologada.", reason: "billing_disabled" }, 503);
    }

    const body = await req.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email : "";
    if (!email) return json({ error: "E-mail é obrigatório" }, 400);

    const result = await provisionClient({
      email,
      fullName: body.fullName ?? null,
      companyName: body.companyName ?? null,
      planCode: body.planCode ?? null,
      billingPeriod: body.billingPeriod ?? null,
      environment: body.environment === "production" ? "production" : "test",
      status: "active",
    });

    return json({ success: true, ...result });
  } catch (e) {
    if (e instanceof AccessError) return json({ error: e.message }, e.status);
    const err = e as Error & { code?: string };
    console.error("provision-client error:", err.code ?? "", err.message);
    if (err.code === "INTERNAL_ACCOUNT") {
      return json(
        { error: "Este e-mail pertence a uma conta interna da Qu4ttuor e não pode virar cliente.", reason: "internal_account" },
        409,
      );
    }
    return json({ error: "Não foi possível provisionar o cliente." }, 500);
  }

});
