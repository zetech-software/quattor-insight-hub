/** Resumo de uso mensal da Calculadora Diesel devolvido por get_diesel_usage(). */
export interface DieselUsage {
  has_plan: boolean;
  plan_code: string | null;
  plan_name: string | null;
  source: "stripe" | "legado_mapeado" | "legado_sem_mapeamento" | null;
  unlimited: boolean;
  limit: number | null;
  used: number;
  remaining: number | null;
  period_start: string;
  next_reset: string;
}

const BRT = "America/Sao_Paulo";

/** Data da próxima renovação no horário de Brasília (DD/MM/AAAA). */
export function formatNextReset(nextResetIso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: BRT, day: "2-digit", month: "2-digit", year: "numeric",
  }).format(new Date(nextResetIso));
}

/** Texto do saldo exibido ao cliente. */
export function describeBalance(u: DieselUsage): string {
  if (!u.has_plan) return "Sem plano Diesel ativo";
  if (u.unlimited) return "Ilimitado";
  return `${u.remaining ?? 0} de ${u.limit ?? 0}`;
}

export function isQuotaExhausted(u: DieselUsage | null | undefined): boolean {
  if (!u) return false;
  if (!u.has_plan) return true;
  return !u.unlimited && (u.remaining ?? 0) <= 0;
}

/** Converte o erro do banco em mensagem para o cliente. */
export function saveErrorMessage(message: string | undefined): string {
  if (message?.includes("diesel_quota_exceeded")) {
    return "Limite mensal de inserções atingido. O saldo renova no dia 1º do próximo mês.";
  }
  if (message?.includes("diesel_access_denied")) {
    return "Sua conta não possui plano ativo da Calculadora Diesel.";
  }
  // Não exponha erros SQL, detalhes internos ou dados do banco ao cliente.
  return "Não foi possível salvar o cálculo. Tente novamente.";
}

/** Gera o identificador da operação; reenvios usam o mesmo valor. */
export function newRequestId(): string {
  return crypto.randomUUID();
}
