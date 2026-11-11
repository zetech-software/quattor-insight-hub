import { describe, expect, it } from "vitest";
import { describeBalance, formatNextReset, isQuotaExhausted, saveErrorMessage, type DieselUsage } from "@/lib/dieselQuota";

const base: DieselUsage = {
  has_plan: true, plan_code: "diesel_basico_mensal", plan_name: "Básico", source: "stripe",
  unlimited: false, limit: 30, used: 12, remaining: 18,
  period_start: "2026-11-01", next_reset: "2026-12-01T03:00:00+00:00",
};

describe("diesel quota display", () => {
  it("next renewal is the 1st at midnight Brasília time", () => {
    expect(formatNextReset(base.next_reset)).toBe("01/12/2026");
  });
  it("Básico shows remaining of 30", () => {
    expect(describeBalance(base)).toBe("18 de 30");
    expect(isQuotaExhausted(base)).toBe(false);
  });
  it("blocks when the 30 monthly insertions are used", () => {
    expect(isQuotaExhausted({ ...base, used: 30, remaining: 0 })).toBe(true);
  });
  it("Superior is unlimited and never exhausted", () => {
    const sup = { ...base, unlimited: true, limit: null, remaining: null, used: 5000 };
    expect(describeBalance(sup)).toBe("Ilimitado");
    expect(isQuotaExhausted(sup)).toBe(false);
  });
  it("no Diesel plan blocks saving", () => {
    expect(isQuotaExhausted({ ...base, has_plan: false, remaining: 0 })).toBe(true);
  });
  it("maps database refusals to client messages", () => {
    expect(saveErrorMessage("diesel_quota_exceeded")).toMatch(/Limite mensal/);
    expect(saveErrorMessage("diesel_access_denied")).toMatch(/plano ativo/);
    expect(saveErrorMessage("relation internal_finance_accounts does not exist")).toBe("Não foi possível salvar o cálculo. Tente novamente.");
    expect(saveErrorMessage("duplicate key value violates unique constraint secret_internal_index")).not.toMatch(/secret_internal_index/);
    expect(saveErrorMessage(undefined)).toBe("Não foi possível salvar o cálculo. Tente novamente.");
  });
});
