import { AccessError, requireOperationalUser } from "../_shared/access.ts";
import { buildCalculationRecord, CalculationInputError } from "../_shared/calculationRecord.ts";

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
    const { user, admin } = await requireOperationalUser(req);
    const reader = req.body?.getReader();
    if (!reader) return json({ error: "Entradas obrigatórias." }, 400);
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 8192) { await reader.cancel(); return json({ error: "Dados muito extensos." }, 413); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    let payload: unknown;
    try { payload = JSON.parse(new TextDecoder().decode(bytes)); }
    catch { return json({ error: "JSON inválido." }, 400); }
    const record = buildCalculationRecord(payload, user.id);
    const { data, error } = await admin.from("calculations").insert(record).select("id").single();
    if (error || !data) {
      console.error("save-calculation persistence failed", error?.code);
      return json({ error: "Não foi possível salvar o cálculo." }, 500);
    }
    return json({ id: data.id }, 201);
  } catch (e) {
    if (e instanceof AccessError) return json({ error: e.message }, e.status);
    if (e instanceof CalculationInputError) return json({ error: e.message }, 400);
    console.error("save-calculation failed", e);
    return json({ error: "Não foi possível salvar o cálculo." }, 500);
  }
});
