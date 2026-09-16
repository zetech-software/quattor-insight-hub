import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Não autorizado" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey =
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ??
      Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller identity
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) return json({ error: "Não autorizado" }, 401);

    // Verify admin role
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .limit(1)
      .single();
    if (!roleData) return json({ error: "Acesso restrito a administradores" }, 403);

    const body = await req.json();
    const { action } = body;

    // === INVITE CLIENT ===
    if (action === "invite") {
      const { email, fullName, companyName } = body;
      if (!email || !fullName) return json({ error: "Email e nome são obrigatórios" }, 400);

      // Create user with temporary password (they'll reset on first login)
      const tempPassword = crypto.randomUUID().slice(0, 12) + "Aa1!";
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });

      if (createError) {
        if (createError.message?.includes("already been registered")) {
          return json({ error: "Este email já está cadastrado no sistema" }, 409);
        }
        return json({ error: createError.message }, 400);
      }

      // Assign the default "cliente" role
      if (newUser.user) {
        const { error: roleError } = await adminClient
          .from("user_roles")
          .upsert({ user_id: newUser.user.id, role: "cliente" }, { onConflict: "user_id,role" });

        if (roleError) {
          return json({ error: "Cliente criado, mas a permissão não pôde ser atribuída. Tente novamente." }, 500);
        }
      }

      // Update profile with company name
      if (companyName && newUser.user) {
        await adminClient
          .from("profiles")
          .update({ full_name: fullName, company_name: companyName })
          .eq("user_id", newUser.user.id);
      }

      // Send password reset email so user can set their own password
      await adminClient.auth.admin.generateLink({
        type: "recovery",
        email,
        options: { redirectTo: `${req.headers.get("origin") || supabaseUrl}/reset-password` },
      });

      return json({ success: true, userId: newUser.user?.id });
    }

    // === TOGGLE ACTIVE STATUS ===
    if (action === "toggle-active") {
      const { userId, isActive } = body;
      if (!userId) return json({ error: "userId é obrigatório" }, 400);

      const { error } = await adminClient
        .from("profiles")
        .update({ is_active: isActive })
        .eq("user_id", userId);

      if (error) return json({ error: error.message }, 400);
      return json({ success: true });
    }

    // === UPDATE SUBSCRIPTION ===
    if (action === "update-subscription") {
      const { userId, planName, status } = body;
      if (!userId) return json({ error: "userId é obrigatório" }, 400);

      const updateData: Record<string, string> = {};
      if (planName) updateData.plan_name = planName;
      if (status) updateData.status = status;

      const { error } = await adminClient
        .from("subscriptions")
        .update(updateData)
        .eq("user_id", userId);

      if (error) return json({ error: error.message }, 400);
      return json({ success: true });
    }

    return json({ error: "Ação não reconhecida" }, 400);
  } catch (e) {
    return json({ error: e.message }, 500);
  }
});
