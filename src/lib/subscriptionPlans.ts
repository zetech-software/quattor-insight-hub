import { supabase } from "@/integrations/supabase/client";

/**
 * Catálogo comercial: o preço NUNCA vem do código, sempre da leitura pública
 * do catálogo. Enquanto os planos não forem aprovados, a lista vem vazia.
 */
export interface PublicPlan {
  code: string;
  name: string;
  description: string | null;
  features: string[];
  billing_period: "mensal" | "anual";
  amount_cents: number | null;
  currency: string;
  is_recommended: boolean;
  sort_order: number;
}

export interface PublicPlansResult {
  plans: PublicPlan[];
  billingReady: boolean;
  environment: "test" | "production";
}

export const catalogEnvironment = (): "test" | "production" =>
  import.meta.env.PROD ? "production" : "test";

export async function fetchPublicPlans(): Promise<PublicPlansResult> {
  const { data, error } = await supabase.functions.invoke<PublicPlansResult>("public-plans", {
    method: "GET",
  });

  if (error || !data) {
    return { plans: [], billingReady: false, environment: catalogEnvironment() };
  }
  return {
    plans: data.plans ?? [],
    billingReady: Boolean(data.billingReady),
    environment: data.environment ?? catalogEnvironment(),
  };
}

export function formatPlanPrice(plan: PublicPlan): string | null {
  if (plan.amount_cents === null || plan.amount_cents === undefined) return null;
  const value = plan.amount_cents / 100;
  try {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: (plan.currency || "brl").toUpperCase(),
    }).format(value);
  } catch {
    return value.toFixed(2);
  }
}
