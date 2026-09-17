import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Função TEMPORÁRIA de semeadura de dados de demonstração.
// Protegida por token compartilhado e removida após o uso.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-seed-token",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  const expected = Deno.env.get("SEED_DEMO_KEY");
  if (!expected || req.headers.get("x-seed-token") !== expected) {
    return json({ error: "Não autorizado" }, 401);
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const body = await req.json();
  const users: Array<{ email: string; full_name: string; company_name: string; password: string }> =
    body.users ?? [];

  const created: Array<{ email: string; user_id: string }> = [];
  const failed: Array<{ email: string; error: string }> = [];

  for (const u of users) {
    const { data, error } = await admin.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: { full_name: u.full_name, company_name: u.company_name },
    });
    if (error || !data?.user) {
      failed.push({ email: u.email, error: error?.message ?? "desconhecido" });
      continue;
    }
    created.push({ email: u.email, user_id: data.user.id });
  }

  return json({ created, failed });
});
