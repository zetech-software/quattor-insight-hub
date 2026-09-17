import type { Tables } from "@/integrations/supabase/types";

export type Calculation = Tables<"calculations">;

/** Formato usado pelas exportações individuais (PDF e Excel). */
export type ExportableCalculation = Pick<
  Calculation,
  | "data"
  | "numero_nf"
  | "placa_ct"
  | "municipio_base"
  
  | "volume_nf"
  | "peso_liquido"
  | "massa_especifica_20_nf"
  | "temperatura_amostra"
  | "densidade_amostra"
  | "temperatura_ct"
  | "situacao_seta"
  | "dnf20"
  | "fcnf"
  | "temperatura_estimada"
  | "dac20"
  | "qualidade_diff"
  | "vct_min"
  | "vct"
  | "vct_max"
  | "fcct"
  | "v20"
  | "volume_recebido"
  | "volume_atestado"
  | "diferenca_volume"
  | "situacao"
  | "created_at"
>;

/**
 * Lê uma data no formato YYYY-MM-DD como data local, evitando o deslocamento
 * de um dia que ocorre quando o navegador interpreta a string como UTC.
 */
export function parseLocalDate(value: string): Date {
  const [y, m, d] = value.slice(0, 10).split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function formatLocalDate(value: string | null | undefined): string {
  if (!value) return "—";
  return parseLocalDate(value).toLocaleDateString("pt-BR");
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("pt-BR");
}
