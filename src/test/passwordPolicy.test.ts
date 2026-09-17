import { describe, expect, it } from "vitest";
import {
  PASSWORD_RULE_TEXT,
  friendlyPasswordError,
  validatePassword,
  validatePasswordPair,
} from "@/lib/passwordPolicy";

describe("política de senha", () => {
  it("recusa senha curta", () => {
    expect(validatePassword("Ab1")).toMatch(/ao menos 8/);
  });

  it("recusa senha sem número", () => {
    expect(validatePassword("somenteletras")).toMatch(/número/);
  });

  it("recusa senha sem letra", () => {
    expect(validatePassword("12345678")).toMatch(/letra/);
  });

  it("aceita senha válida", () => {
    expect(validatePassword("Qu4ttuor2026")).toBeNull();
  });

  it("recusa confirmação divergente antes de validar força", () => {
    expect(validatePasswordPair("Qu4ttuor2026", "Qu4ttuor2027")).toMatch(/não coincidem/);
  });

  it("aceita par válido", () => {
    expect(validatePasswordPair("Qu4ttuor2026", "Qu4ttuor2026")).toBeNull();
  });
});

describe("mensagens amigáveis", () => {
  it("traduz senha fraca", () => {
    expect(friendlyPasswordError("Password should be at least 6 characters")).toBe(PASSWORD_RULE_TEXT);
  });

  it("traduz link expirado", () => {
    expect(friendlyPasswordError("Token has expired or is invalid")).toMatch(/expirou/);
  });

  it("traduz falha de rede", () => {
    expect(friendlyPasswordError("Failed to fetch")).toMatch(/conexão/);
  });

  it("usa texto genérico para erro desconhecido", () => {
    expect(friendlyPasswordError("boom")).toMatch(/Tente novamente/);
  });
});
