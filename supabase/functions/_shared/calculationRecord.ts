import { calculateDiesel, validateDieselInputs, type DieselInputs } from "./dieselCalculations.ts";

export class CalculationInputError extends Error {}
const numericKeys = ["volumeNF", "pesoLiquido", "massaEspecifica20NF", "temperaturaAmostra", "densidadeAmostra", "temperaturaCT", "situacaoSeta"] as const;
function text(value: unknown, name: string, max: number): string {
  if (typeof value !== "string" || value.length > max) throw new CalculationInputError(name + " inválido.");
  return value.trim();
}

/** Only source inputs are accepted. Caller identity and all results are server-owned. */
export function buildCalculationRecord(payload: unknown, userId: string) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new CalculationInputError("Dados inválidos.");
  const raw = (payload as Record<string, unknown>).inputs;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new CalculationInputError("Entradas obrigatórias.");
  const v = raw as Record<string, unknown>;
  for (const key of numericKeys) {
    if (typeof v[key] !== "number" || !Number.isFinite(v[key])) throw new CalculationInputError("Dados numéricos obrigatórios.");
  }
  const data = text(v.data, "Data", 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || !Number.isFinite(Date.parse(data)) || new Date(data).toISOString().slice(0, 10) !== data) throw new CalculationInputError("Data inválida.");
  const inputs: DieselInputs = {
    data,
    numeroNF: text(v.numeroNF, "Número NF", 100),
    placaCT: text(v.placaCT, "Placa", 30),
    ...Object.fromEntries(numericKeys.map((key) => [key, v[key]])),
  } as DieselInputs;
  const inputError = validateDieselInputs(inputs);
  if (inputError) throw new CalculationInputError(inputError);
  const result = calculateDiesel(inputs);
  if (!result || Object.values(result).some((x) => typeof x === "number" && !Number.isFinite(x))) {
    throw new CalculationInputError("Dados fora da faixa de cálculo. Confira as medições.");
  }
  return {
    user_id: userId, data,
    numero_nf: inputs.numeroNF || null, placa_ct: inputs.placaCT || null,
    municipio_base: text(v.municipioBase ?? "", "Município", 200) || null,
    volume_nf: inputs.volumeNF, peso_liquido: inputs.pesoLiquido,
    massa_especifica_20_nf: inputs.massaEspecifica20NF,
    temperatura_amostra: inputs.temperaturaAmostra, densidade_amostra: inputs.densidadeAmostra,
    temperatura_ct: inputs.temperaturaCT, situacao_seta: inputs.situacaoSeta,
    dnf20: result.dnf20, fcnf: result.fcnf, temperatura_estimada: result.temperaturaEstimada,
    dac20: result.dac20, qualidade_diff: result.qualidadeDiff,
    vct_min: result.vctMin, vct: result.vct, vct_max: result.vctMax,
    fcct: result.fcct, v20: result.v20, volume_recebido: result.volumeRecebido,
    volume_atestado: result.volumeAtestado, diferenca_volume: result.diferencaVolume, situacao: result.situacao,
  };
}
