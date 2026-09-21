import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

export interface ProvisionInput {
  email: string;
  fullName?: string | null;
  companyName?: string | null;
  planCode?: string | null;
  billingPeriod?: string | null;
  environment: "test" | "production";
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  stripeProductId?: string | null;
  stripePriceId?: string | null;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  status?: "active" | "trial" | "expired" | "cancelled";
}

export function adminClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

async function findUserIdByEmail(supabase: SupabaseClient, email: string): Promise<string | null> {
  // Admin API não tem busca por e-mail; percorre páginas até encontrar.
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`listUsers failed: ${error.message}`);
    const found = data.users.find((u) => (u.email ?? "").toLowerCase() === email.toLowerCase());
    if (found) return found.id;
    if (data.users.length < 200) break;
  }
  return null;
}

/** Papéis internos da Qu4ttuor: nunca podem ser provisionados por pagamento. */
export const INTERNAL_ROLES = ["admin", "support", "manager"] as const;

export function internalRolesOf(roles: Array<{ role?: string | null }> | null | undefined): string[] {
  return (roles ?? [])
    .map((r) => (r.role ?? "").toString())
    .filter((role) => (INTERNAL_ROLES as readonly string[]).includes(role));
}

export class InternalAccountError extends Error {
  code = "INTERNAL_ACCOUNT";
  constructor(public roles: string[]) {
    super(`Provisionamento recusado: conta interna (${roles.join(", ")})`);
  }
}

/**
 * Recusa o provisionamento quando o e-mail já pertence a uma conta interna.
 * Nenhum papel existente é alterado por causa de pagamento.
 */
export async function assertNotInternalAccount(supabase: SupabaseClient, userId: string): Promise<void> {
  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  if (error) throw new Error(`role check failed: ${error.message}`);
  const internal = internalRolesOf(data as Array<{ role?: string | null }>);
  if (internal.length > 0) throw new InternalAccountError(internal);
}

/**
 * Provisionamento de cliente a partir de um pagamento confirmado.
 * - nunca duplica conta: e-mail já existente apenas recebe/atualiza a assinatura
 * - conta interna (admin/support/manager) é recusada e registrada
 * - permissão SEMPRE fixa em 'client'; nada vindo do checkout define papel
 * - não define senha nem envia e-mail: a entrega da credencial é decidida depois
 */
export async function provisionClient(input: ProvisionInput): Promise<{ userId: string; created: boolean }> {
  const email = input.email.trim().toLowerCase();
  if (!email) throw new Error("E-mail do pagamento ausente");

  const supabase = adminClient();
  let userId = await findUserIdByEmail(supabase, email);
  let created = false;

  if (userId) {
    // Conta já existente: só segue se for conta de cliente.
    await assertNotInternalAccount(supabase, userId);
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      email_confirm: false,
      user_metadata: {
        full_name: input.fullName ?? null,
        company_name: input.companyName ?? null,
      },
    });
    if (error || !data.user) throw new Error(`createUser failed: ${error?.message ?? "sem usuário"}`);
    userId = data.user.id;
    created = true;
  }


  // Permissão exclusiva de cliente.
  const { error: roleError } = await supabase
    .from("user_roles")
    .upsert({ user_id: userId, role: "client" }, { onConflict: "user_id,role" });
  if (roleError) throw new Error(`role failed: ${roleError.message}`);

  // Perfil: primeiro acesso exige definição de senha e conclusão do cadastro.
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      ...(input.fullName ? { full_name: input.fullName } : {}),
      ...(input.companyName ? { company_name: input.companyName } : {}),
      must_change_password: true,
    })
    .eq("user_id", userId);
  if (profileError) throw new Error(`profile failed: ${profileError.message}`);

  // Assinatura vinculada.
  const subscription = {
    user_id: userId,
    status: input.status ?? "active",
    plan_code: input.planCode ?? null,
    plan_name: input.planCode ?? "Assinatura",
    billing_period: input.billingPeriod ?? null,
    environment: input.environment,
    stripe_customer_id: input.stripeCustomerId ?? null,
    stripe_subscription_id: input.stripeSubscriptionId ?? null,
    stripe_product_id: input.stripeProductId ?? null,
    stripe_price_id: input.stripePriceId ?? null,
    current_period_start: input.currentPeriodStart ?? null,
    current_period_end: input.currentPeriodEnd ?? null,
  };

  const { data: existing } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await supabase.from("subscriptions").update(subscription).eq("id", existing.id);
    if (error) throw new Error(`subscription update failed: ${error.message}`);
  } else {
    const { error } = await supabase.from("subscriptions").insert(subscription);
    if (error) throw new Error(`subscription insert failed: ${error.message}`);
  }

  return { userId, created };
}
