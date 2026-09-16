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

    // Permissão do chamador: admin ou gestão (manager)
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: callerRoles } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id);

    const roles = (callerRoles ?? []).map((r: { role: string }) => r.role);
    const isAdmin = roles.includes("admin");
    const isManager = roles.includes("manager");
    if (!isAdmin && !isManager) {
      return json({ error: "Acesso restrito a administradores" }, 403);
    }

    // Só o admin pode agir sobre contas administrativas (admin/gestão)
    const isStaffAccount = async (userId: string) => {
      const { data } = await adminClient
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .in("role", ["admin", "manager"]);
      return (data ?? []).length > 0;
    };

    const body = await req.json();
    const { action } = body;

    // === INVITE CLIENT ===
    if (action === "invite") {
      const { email, fullName, companyName } = body;
      if (!email || !fullName) return json({ error: "Email e nome são obrigatórios" }, 400);

      const origin = req.headers.get("origin");
      // Convite oficial: cria a conta E envia o e-mail para o cliente definir a própria senha.
      const { data: invited, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
        email,
        {
          data: { full_name: fullName, company_name: companyName ?? null },
          redirectTo: origin ? `${origin}/reset-password` : undefined,
        },
      );

      if (inviteError) {
        if (inviteError.message?.includes("already been registered")) {
          return json({ error: "Este email já está cadastrado no sistema" }, 409);
        }
        console.error("invite failed:", inviteError.status ?? "", inviteError.name ?? "");
        return json(
          { error: "Não foi possível enviar o convite por e-mail. Verifique o endereço e tente novamente." },
          502,
        );
      }

      const invitedUser = invited?.user;
      if (!invitedUser) {
        return json({ error: "Não foi possível criar o cliente. Tente novamente." }, 500);
      }

      // Permissão de cliente (obrigatória).
      const { error: roleError } = await adminClient
        .from("user_roles")
        .upsert({ user_id: invitedUser.id, role: "client" }, { onConflict: "user_id,role" });

      if (roleError) {
        return json({ error: "Cliente criado, mas a permissão não pôde ser atribuída. Tente novamente." }, 500);
      }

      // Nome e empresa no perfil.
      const { error: profileError } = await adminClient
        .from("profiles")
        .update({ full_name: fullName, company_name: companyName ?? null })
        .eq("user_id", invitedUser.id);

      if (profileError) {
        return json({ error: "Cliente convidado, mas os dados do perfil não foram salvos. Edite e tente novamente." }, 500);
      }

      return json({ success: true, userId: invitedUser.id });
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
