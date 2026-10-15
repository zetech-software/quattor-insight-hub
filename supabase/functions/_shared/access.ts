import { createClient } from "npm:@supabase/supabase-js@2";

export class AccessError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

/** Validate identity and current database state on every operational request. */
export async function requireAuthenticatedUser(req: Request) {
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY");
  if (!token || !url || !anon || token === anon) throw new AccessError(401, "Não autorizado");
  const identity = createClient(url, anon);
  const { data, error } = await identity.auth.getUser(token);
  if (error || !data.user) throw new AccessError(401, "Não autorizado");
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  return { user: data.user, admin, token, url, anon };
}

export async function requireOperationalUser(req: Request, allowedRoles?: string[]) {
  const { user, admin } = await requireAuthenticatedUser(req);
  const [profile, roles] = await Promise.all([
    admin.from("profiles").select("is_active, must_change_password").eq("user_id", user.id).maybeSingle(),
    admin.from("user_roles").select("role").eq("user_id", user.id),
  ]);
  if (profile.error || roles.error) throw new AccessError(503, "Não foi possível verificar o acesso.");
  const roleNames = (roles.data ?? []).map((r: { role: string }) => r.role);
  if (!profile.data?.is_active || profile.data.must_change_password || !roleNames.length) {
    throw new AccessError(403, "Conta sem acesso operacional. Verifique sua situação e sua senha.");
  }
  if (allowedRoles && !roleNames.some((r: string) => allowedRoles.includes(r))) {
    throw new AccessError(403, "Acesso não permitido.");
  }
  return { user, roles: roleNames, admin };
}
