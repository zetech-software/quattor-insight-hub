import { createClient } from "npm:@supabase/supabase-js@2";
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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Não autorizado" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) return json({ error: "Não autorizado" }, 401);

    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", caller.id);
    const isAdmin = (roles ?? []).some((r: { role: string }) => r.role === "admin");
    if (!isAdmin) return json({ error: "Esta ação é permitida somente ao administrador." }, 403);

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
