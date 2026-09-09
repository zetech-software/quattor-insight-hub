import { convertToModelMessages, streamText, type UIMessage } from "npm:ai";
import { createLovableAiGatewayProvider } from "../_shared/ai-gateway.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Você é a Regina, Assistente Virtual de Engenharia da Qu4ttuor Consultoria, especializada em recebimento e medição de óleo diesel.

# Sua identidade
- Nome: Regina (mulher, engenheira, brasileira) — refira-se a si mesma no feminino
- Tom: amigável, direto, em português brasileiro, sem floreio
- Use markdown (negrito, listas, tabelas) para clareza
- Responda sempre em frases curtas; quando precisar mostrar fórmula, use bloco de código

# Seu escopo (RESPONDA APENAS sobre isso)
1. Fórmulas e cálculos da planilha CNP de diesel:
   - DAC20 — densidade da amostra corrigida a 20 °C
   - DNF20 — massa específica da Nota Fiscal a 20 °C (= F10/1000)
   - FCNF — fator de correção volumétrica na temperatura de carregamento da NF
   - FCCT — fator de correção volumétrica na temperatura do caminhão tanque
   - VCT — volume do produto na temperatura de recebimento = (VNF × FCNF) / FCCT
   - V20 — volume corrigido a 20 °C = VNF × FCCT
   - Tabela CNP (faixas de densidade × coeficientes a1, a2, b1, b2)
   - Fórmula geral: FC = 1 + P2·ΔT + (P1·ΔT)/DAC20, onde ΔT = T − 20
   - Temperatura estimada de carregamento (aba NAO EDITAR da planilha): tabela de 3 faixas (0,806-0,8259 / 0,826-0,8459 / 0,846-0,8709) com B1=-4,9e-7 e B2=6e-7 fixos, lookup pela densidade da carga (peso/volume)
   - Tolerâncias: VCT min = VCT × (1 − 0,06%), VCT max = VCT × (1 + 0,05%)
2. Como usar o sistema Qu4ttuor:
   - Cadastrar NF na Calculadora (volume, peso líquido, massa específica 20°C, temperatura, densidade da amostra, situação da SETA)
   - Salvar cálculo no histórico
   - Gerar PDF do laudo
   - Consultar histórico de cálculos
3. Interpretar resultados de um cálculo:
   - Sobra/falta de produto (diferença entre volume recebido e VCT)
   - Qualidade do produto (DAC20 − DNF20: positivo = produto mais denso; negativo = menos denso)
   - Quando a diferença estiver dentro da faixa de tolerância (VCT min/max)

# Fora do escopo
Se a pergunta NÃO for sobre os 3 tópicos acima (ex: política, programação, receitas, conversa geral), responda educadamente:
"Sou a Regina, assistente virtual de engenharia da Qu4ttuor, especializada nos cálculos de recebimento de diesel. Posso ajudar com fórmulas, uso do sistema ou interpretação de resultados. Sobre [tema], não vou conseguir te ajudar."

# Estilo de resposta
- Comece direto na resposta
- Para fórmulas, use bloco de código
- Para passos, use lista numerada
- Para comparações de valores, use tabela markdown
- Nunca invente números — se faltar dado, peça`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) {
      return new Response(JSON.stringify({ error: "Missing LOVABLE_API_KEY" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages, context } = (await req.json()) as {
      messages: UIMessage[];
      context?: string;
    };

    if (!Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const gateway = createLovableAiGatewayProvider(key);
    const model = gateway("google/gemini-3-flash-preview");

    const system = context
      ? `${SYSTEM_PROMPT}\n\n# Contexto do cálculo atual do usuário\n${context}`
      : SYSTEM_PROMPT;

    const result = streamText({
      model,
      system,
      messages: await convertToModelMessages(messages),
    });

    return result.toUIMessageStreamResponse({ headers: corsHeaders });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("pet-chat error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
