/**
 * Lógica pura de cobrança, sem acesso a ambiente (Deno/Supabase/Stripe).
 * Mantida separada para poder ser testada de forma determinística.
 */

/** Planos avulsos (ex.: minicurso por módulo) usam pagamento único. */
export function resolveCheckoutMode(billingPeriod: string | null | undefined): "payment" | "subscription" {
  return billingPeriod === "avulso" ? "payment" : "subscription";
}

/**
 * Validação de URL de retorno: apenas origens autorizadas no servidor.
 * Nada de abrir redirecionamento para origem arbitrária enviada pelo navegador.
 */
export function isAllowedReturnUrl(rawUrl: string, allowedOrigins: string[]): boolean {
  if (!rawUrl || allowedOrigins.length === 0) return false;
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return false;
  return allowedOrigins.includes(url.origin);
}

export function parseAllowedOrigins(envValue: string | undefined): string[] {
  return (envValue ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter((o) => /^https?:\/\/[^/]+$/.test(o));
}

/** Prazo de acesso dos minicursos avulsos (dias). */
export const MINICURSO_ACCESS_DAYS = 30;

/**
 * Fim do período de acesso:
 * - assinatura: datas vindas do Stripe (período cobrado);
 * - avulso: compra + MINICURSO_ACCESS_DAYS dias.
 */
export function computeAccessPeriodEnd(opts: {
  billingPeriod: string | null | undefined;
  createdSeconds: number | null | undefined;
  subscriptionPeriodEndSeconds: number | null | undefined;
}): string | null {
  if (opts.billingPeriod !== "avulso") {
    return opts.subscriptionPeriodEndSeconds
      ? new Date(opts.subscriptionPeriodEndSeconds * 1000).toISOString()
      : null;
  }
  const start = opts.createdSeconds ?? Math.floor(Date.now() / 1000);
  return new Date((start + MINICURSO_ACCESS_DAYS * 86400) * 1000).toISOString();
}

/**
 * Mapeamento do status do Stripe para o enum local `subscription_status`
 * ('active','trial','expired','cancelled').'past_due' fica em período de
 * tolerância como 'active'; a recusa é tratada pelo evento de fatura.
 */
export function mapSubscriptionStatus(stripeStatus: string | null | undefined): string {
  const map: Record<string, string> = {
    trialing: "trial",
    active: "active",
    past_due: "active",
    canceled: "cancelled",
    unpaid: "expired",
    incomplete: "trial",
    incomplete_expired: "expired",
    paused: "expired",
  };
  return map[stripeStatus ?? ""] ?? "active";
}
