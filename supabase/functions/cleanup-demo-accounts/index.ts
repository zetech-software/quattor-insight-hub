import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authorization = req.headers.get("Authorization");
  if (!url || !key || !authorization) return json({ error: "Unauthorized" }, 401);
  const client = createClient(url, key);
  const { data: { user }, error: authError } = await client.auth.getUser(authorization.replace(/^Bearer\s+/i, ""));
  if (authError || !user) return json({ error: "Unauthorized" }, 401);
  const { data: roles, error: rolesError } = await client.from("user_roles").select("role").eq("user_id", user.id);
  if (rolesError || !roles?.some(r => r.role === "admin")) return json({ error: "Admin required" }, 403);
  const body = await req.json().catch(() => null);
  if (body?.confirmation !== "remove-marked-demo-accounts") return json({ error: "Confirmation required" }, 400);
  const { data: profiles, error } = await client.from("profiles").select("user_id,full_name").ilike("full_name", "%[DEMO]%");
  if (error) return json({ error: "Unable to list demo accounts" }, 500);
  const targets: string[] = [];
  for (const profile of profiles ?? []) {
    const { data: targetRoles, error: roleError } = await client.from("user_roles").select("role").eq("user_id", profile.user_id);
    const { data: account, error: accountError } = await client.auth.admin.getUserById(profile.user_id);
    const email = account?.user?.email ?? "";
    const demoEmail = /^demo[1-9]@exemplo\.qu4ttuor\.com\.br$/.test(email) || /^[a-z-]+\.demo@example\.com$/.test(email);
    if (roleError || accountError || !demoEmail || !targetRoles?.length || targetRoles.some(r => r.role !== "client")) {
      return json({ error: "Demo safety validation failed; no accounts deleted" }, 409);
    }
    targets.push(profile.user_id);
  }
  const deleted: string[] = [];
  for (const id of targets) {
    const { error: deleteError } = await client.auth.admin.deleteUser(id);
    if (deleteError) return json({ error: "Account deletion failed", deleted, failed: id }, 500);
    deleted.push(id);
  }
  return json({ deletedCount: deleted.length, deleted });
});