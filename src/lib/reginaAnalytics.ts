import { supabase } from "@/integrations/supabase/client";
import { classifyReginaQuestion } from "@/lib/reginaTopics";

export type ReginaOrigin = "chat" | "pagina";

/**
 * Registra o início de uma interação (situação "pendente") e devolve o id da linha.
 * Nunca lança: falha de registro não pode interromper a conversa.
 */
export async function startReginaInteraction(
  userId: string,
  question: string,
  origin: ReginaOrigin,
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from("regina_interactions")
      .insert({
        user_id: userId,
        question: question.slice(0, 2000),
        topic: classifyReginaQuestion(question),
        origin,
      })
      .select("id")
      .single();
    if (error) throw error;
    return data?.id ?? null;
  } catch (e) {
    console.error("regina analytics: falha ao registrar interação", e);
    return null;
  }
}

/**
 * Fecha a interação existente com o resultado final. Nunca lança.
 */
export async function finishReginaInteraction(
  interactionId: string | null,
  status: "respondida" | "falha",
): Promise<void> {
  if (!interactionId) return;
  try {
    const { error } = await supabase
      .from("regina_interactions")
      .update({ status })
      .eq("id", interactionId);
    if (error) throw error;
  } catch (e) {
    console.error("regina analytics: falha ao concluir interação", e);
  }
}
