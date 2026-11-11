import { supabase } from "@/integrations/supabase/client";
import type { DieselUsage } from "@/lib/dieselQuota";

// Funções do banco criadas em 20261110180000_diesel_quota_and_product_rights.sql.
// Tipadas aqui até a regeneração dos tipos no ambiente de homologação.
type Rpc = (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
const rpc = supabase.rpc.bind(supabase) as unknown as Rpc;

export async function fetchDieselUsage(): Promise<DieselUsage | null> {
  const { data, error } = await rpc("get_diesel_usage");
  return error || !data ? null : (data as DieselUsage);
}

export async function saveDieselCalculation(requestId: string, calculation: Record<string, unknown>) {
  const { error } = await rpc("save_diesel_calculation", { p_request_id: requestId, p_calculation: calculation });
  return { error };
}
