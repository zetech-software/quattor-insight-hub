/**
 * Direito de acesso a recursos pagos, calculado no cliente a partir da
 * assinatura no banco. O webhook define o status; aqui apenas interpretamos.
 *
 * Regras:
 * - 'active': acesso liberado enquanto current_period_end não venceu.
 * - 'trial': NÃO libera benefício pago — é o status de provisionamento usado
 *   para pagamento assíncrono pendente (Pix/boleto). Sem confirmação de
 *   pagamento, não há acesso.
 * - 'expired' / 'cancelled': sem acesso.
 * - Sem assinatura: sem acesso (o frontend usa isso para oferecer os planos).
 *
 * A exceção histórica é o usuário legado do período pré-cobrança: enquanto a
 * cobrança não é homologada (BILLING_HOMOLOGATED=false), a aplicação não
 * deve aplicar este filtro de bloqueio — ver decisão no PR.
 */

export interface SubscriptionAccessInfo {
  status: string | null | undefined;
  current_period_end: string | null | undefined;
}

export type AccessDecision = "allowed" | "blocked" | "no_subscription";

export function evaluateSubscriptionAccess(
  subscription: SubscriptionAccessInfo | null | undefined,
  now: Date = new Date(),
): AccessDecision {
  if (!subscription) return "no_subscription";
  const status = (subscription.status ?? "").toLowerCase();
  if (status !== "active") return "blocked";
  if (!subscription.current_period_end) return "allowed";
  const end = new Date(subscription.current_period_end);
  if (Number.isNaN(end.getTime())) return "allowed";
  return end.getTime() > now.getTime() ? "allowed" : "blocked";
}

export function hasPaidAccess(
  subscription: SubscriptionAccessInfo | null | undefined,
  now: Date = new Date(),
): boolean {
  return evaluateSubscriptionAccess(subscription, now) === "allowed";
}
