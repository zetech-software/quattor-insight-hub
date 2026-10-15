export type ReginaTopic =
  | "formulas"
  | "tolerancia"
  | "seta_diferenca"
  | "qualidade"
  | "uso_sistema"
  | "relatorios"
  | "outros";

export const REGINA_TOPIC_LABELS: Record<ReginaTopic, string> = {
  formulas: "Fórmulas e cálculos",
  tolerancia: "Tolerância e limites",
  seta_diferenca: "Seta, sobra e falta",
  qualidade: "Qualidade do produto",
  uso_sistema: "Uso do sistema",
  relatorios: "Relatórios e exportações",
  outros: "Outros",
};

export function topicLabel(topic: string | null | undefined): string {
  if (!topic) return REGINA_TOPIC_LABELS.outros;
  return REGINA_TOPIC_LABELS[topic as ReginaTopic] ?? REGINA_TOPIC_LABELS.outros;
}

const RULES: Array<{ topic: ReginaTopic; words: RegExp }> = [
  { topic: "tolerancia", words: /toler[âa]nc|limite|vct m[íi]n|vct m[áa]x|0,06|0\.06|faixa aceit/i },
  { topic: "qualidade", words: /qualidade|aprovad|reprovad|densidade|dac|dnf|massa espec|devolver o caminh/i },
  { topic: "seta_diferenca", words: /seta|sobra|falta|diferen[çc]a|volume atestado|atestad/i },
  { topic: "relatorios", words: /relat[óo]rio|pdf|excel|planilha|exportar|exporta[çc]|laudo|csv/i },
  { topic: "formulas", words: /f[óo]rmula|fcct|fcnf|v20|vct|cnp|coeficiente|calcul[ao]r|corre[çc][ãa]o/i },
  { topic: "uso_sistema", words: /como (fa[çz]o|uso|cadastr|salv)|hist[óo]rico|sistema|plataforma|tela|login|senha|onde vejo/i },
];

export function classifyReginaQuestion(text: string): ReginaTopic {
  const q = (text || "").trim();
  if (!q) return "outros";
  for (const rule of RULES) {
    if (rule.words.test(q)) return rule.topic;
  }
  return "outros";
}
