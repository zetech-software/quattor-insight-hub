import { describe, expect, it } from "vitest";
import {
  MINICURSO_ACCESS_DAYS,
  computeAccessPeriodEnd,
  isAllowedReturnUrl,
  mapSubscriptionStatus,
  parseAllowedOrigins,
  resolveCheckoutMode,
} from "../../supabase/functions/_shared/billingLogic.ts";

describe("resolveCheckoutMode", () => {
  it("usa pagamento único para planos avulsos (minicurso)", () => {
    expect(resolveCheckoutMode("avulso")).toBe("payment");
    expect(resolveCheckoutMode(null)).toBe("subscription");
  });

  it("usa assinatura para mensal e anual", () => {
    expect(resolveCheckoutMode("mensal")).toBe("subscription");
    expect(resolveCheckoutMode("anual")).toBe("subscription");
  });
});

describe("isAllowedReturnUrl", () => {
  const origins = ["https://app.qu4ttuorconsultoria.com.br", "http://localhost:5173"];

  it("aceita URL de origem autorizada", () => {
    expect(
      isAllowedReturnUrl("https://app.qu4ttuorconsultoria.com.br/assinatura/ok", origins),
    ).toBe(true);
    expect(isAllowedReturnUrl("http://localhost:5173/voltar", origins)).toBe(true);
  });

  it("rejeita origem diferente (open redirect)", () => {
    expect(isAllowedReturnUrl("https://evil.example.com/assinatura", origins)).toBe(false);
  });

  it("rejeita origem parecida, porém distinta", () => {
    expect(
      isAllowedReturnUrl("https://app.qu4ttuorconsultoria.com.br.evil.com/ok", origins),
    ).toBe(false);
  });

  it("rejeita URL malformada, sem origens autorizadas ou protocolo estranho", () => {
    expect(isAllowedReturnUrl("não é url", origins)).toBe(false);
    expect(isAllowedReturnUrl("https://app.qu4ttuorconsultoria.com.br", [])).toBe(false);
    expect(isAllowedReturnUrl("javascript:alert(1)", origins)).toBe(false);
  });
});

describe("parseAllowedOrigins", () => {
  it("interpreta lista separada por vírgula e descarta valores inválidos", () => {
    expect(parseAllowedOrigins("https://a.com , http://localhost:5173, lixo, https://b.com/path")).toEqual([
      "https://a.com",
      "http://localhost:5173",
    ]);
  });

  it("retorna lista vazia para env ausente", () => {
    expect(parseAllowedOrigins(undefined)).toEqual([]);
  });
});

describe("computeAccessPeriodEnd", () => {
  it("minicurso avulso: compra + 30 dias", () => {
    const created = new Date("2026-11-04T12:00:00Z").getTime() / 1000;
    const end = computeAccessPeriodEnd({
      billingPeriod: "avulso",
      createdSeconds: created,
      subscriptionPeriodEndSeconds: null,
    });
    const expected = new Date(created * 1000);
    expected.setUTCDate(expected.getUTCDate() + MINICURSO_ACCESS_DAYS);
    expect(end).toBe(expected.toISOString());
  });

  it("assinatura: usa o período cobrado do Stripe, ignora os 30 dias", () => {
    const end = computeAccessPeriodEnd({
      billingPeriod: "mensal",
      createdSeconds: 0,
      subscriptionPeriodEndSeconds: 1799999999,
    });
    expect(end).toBe(new Date(1799999999 * 1000).toISOString());
  });

  it("assinatura sem período informado: null (webhook de assinatura completa depois)", () => {
    expect(
      computeAccessPeriodEnd({ billingPeriod: "mensal", createdSeconds: 0, subscriptionPeriodEndSeconds: null }),
    ).toBeNull();
  });
});

describe("mapSubscriptionStatus", () => {
  it("mapeia os status do Stripe para o enum local", () => {
    expect(mapSubscriptionStatus("active")).toBe("active");
    expect(mapSubscriptionStatus("trialing")).toBe("trial");
    expect(mapSubscriptionStatus("canceled")).toBe("cancelled");
    expect(mapSubscriptionStatus("unpaid")).toBe("expired");
    expect(mapSubscriptionStatus("incomplete_expired")).toBe("expired");
    expect(mapSubscriptionStatus("paused")).toBe("expired");
  });

  it("past_due fica em tolerância como active", () => {
    expect(mapSubscriptionStatus("past_due")).toBe("active");
  });

  it("status desconhecido não quebra o fluxo", () => {
    expect(mapSubscriptionStatus("status_futuro")).toBe("active");
    expect(mapSubscriptionStatus(null)).toBe("active");
  });
});
