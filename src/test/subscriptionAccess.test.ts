import { describe, expect, it } from "vitest";
import {
  evaluateSubscriptionAccess,
  hasPaidAccess,
} from "../lib/subscriptionAccess";

const now = new Date("2026-11-04T12:00:00Z");

describe("evaluateSubscriptionAccess", () => {
  it("permite acesso ativo dentro do período", () => {
    expect(
      hasPaidAccess({
        status: "active",
        current_period_end: "2026-11-10T00:00:00Z",
      }, now),
    ).toBe(true);
  });

  it("bloqueia acesso ativo com período vencido (minicurso de 30 dias)", () => {
    const decision = evaluateSubscriptionAccess({
      status: "active",
      current_period_end: "2026-11-01T00:00:00Z",
    }, now);
    expect(decision).toBe("blocked");
  });

  it("trial (pagamento assíncrono pendente) NÃO libera benefício pago", () => {
    expect(
      hasPaidAccess({
        status: "trial",
        current_period_end: "2099-01-01T00:00:00Z",
      }, now),
    ).toBe(false);
  });

  it("expired e cancelled bloqueiam", () => {
    expect(hasPaidAccess({ status: "expired", current_period_end: null }, now)).toBe(false);
    expect(hasPaidAccess({ status: "cancelled", current_period_end: null }, now)).toBe(false);
  });

  it("sem assinatura é 'no_subscription', não 'blocked'", () => {
    expect(evaluateSubscriptionAccess(null, now)).toBe("no_subscription");
    expect(evaluateSubscriptionAccess(undefined, now)).toBe("no_subscription");
  });

  it("período ausente ou inválido não nega acesso a assinatura ativa (Stripe é a fonte)", () => {
    expect(hasPaidAccess({ status: "active", current_period_end: null }, now)).toBe(true);
    expect(hasPaidAccess({ status: "active", current_period_end: "banana" }, now)).toBe(true);
  });
});
