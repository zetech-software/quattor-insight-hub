import { AccessError, requireAuthenticatedUser } from "../_shared/access.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
Deno.serve(async (req) => {
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
    status, headers: { ...cors, "Content-Type": "application/json" },
  });
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);
  try {
    // Recovery/invite sessions must be able to change passwords before operational access.
    const { user, admin, token, url, anon } = await requireAuthenticatedUser(req);
    const body = await req.json();
    const password = body?.password;
    if (typeof password !== "string" || password.length < 8 || password.length > 128 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      return json({ error: "Use de 8 a 128 caracteres, incluindo letra e número." }, 400);
    }
    // Use the user endpoint so Auth password/reauthentication policies still apply.
    const response = await fetch(url + "/auth/v1/user", {
      method: "PUT",
      headers: { Authorization: "Bearer " + token, apikey: anon, "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!response.ok) {
      // Do not log credentials or forward provider internals.
      return json({ error: "Não foi possível atualizar a senha. Confira os requisitos ou solicite um novo link." }, response.status === 401 ? 401 : 400);
    }
    const changed = await response.json();
    if (changed.id !== user.id) throw new Error("Unexpected Auth identity");
    const { data, error } = await admin.from("profiles").update({ must_change_password: false })
      .eq("user_id", user.id).select("user_id").single();
    if (error || !data) {
      return json({ error: "Senha atualizada, mas o acesso ainda não foi liberado. Entre com a nova senha e tente novamente." }, 503);
    }
    return json({ success: true });
  } catch (e) {
    if (e instanceof AccessError) return json({ error: e.message }, e.status);
    return json({ error: "Não foi possível atualizar a senha." }, 500);
  }
});
