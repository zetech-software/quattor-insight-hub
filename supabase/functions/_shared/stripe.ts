import Stripe from "npm:stripe@22.0.2";
export type { Stripe };

const getEnv = (key: string): string => {
  const value = Deno.env.get(key);
  if (!value) throw new Error(`${key} is not configured`);
  return value;
};

export type StripeEnv = 'sandbox' | 'live';

const GATEWAY_STRIPE_BASE = 'https://connector-gateway.lovable.dev/stripe';

export function getConnectionApiKey(env: StripeEnv): string {
  const key = getEnv(env === 'sandbox' ? 'STRIPE_SANDBOX_API_KEY' : 'STRIPE_LIVE_API_KEY');
  if (env === 'sandbox' && /^(sk|rk)_live_/.test(key)) throw new Error('Live key in sandbox');
  return key;
}

// Routes api.stripe.com requests through the connector gateway.
export function createStripeClient(env: StripeEnv): Stripe {
  const connectionApiKey = getConnectionApiKey(env);
  const lovableApiKey = getEnv('LOVABLE_API_KEY');

  return new Stripe(connectionApiKey, {
    apiVersion: '2026-03-25.dahlia',
    httpClient: Stripe.createFetchHttpClient((input, init) => {
      const stripeUrl = input instanceof Request ? input.url : input.toString();
      const url = new URL(stripeUrl);
      if (url.origin !== "https://api.stripe.com") throw new Error("Unexpected Stripe API origin");
      const gatewayUrl = GATEWAY_STRIPE_BASE + url.pathname + url.search;
      return fetch(gatewayUrl, {
        ...init,
        redirect: "error",
        headers: {
          ...Object.fromEntries(
            new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined)).entries(),
          ),
          'X-Connection-Api-Key': connectionApiKey,
          'Lovable-API-Key': lovableApiKey,
        },
      });
    }),
  });
}

export async function verifyWebhook(req: Request, env: StripeEnv): Promise<Stripe.Event> {
  const signature = req.headers.get("stripe-signature");
  if (!signature) throw new Error("Missing Stripe signature");
  const timestamp = signature.match(/(?:^|,)t=(\d+)(?:,|$)/)?.[1];
  if (!timestamp || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) {
    throw new Error("Invalid Stripe signature timestamp");
  }
  const secret = getEnv(env === "sandbox" ? "PAYMENTS_SANDBOX_WEBHOOK_SECRET" : "PAYMENTS_LIVE_WEBHOOK_SECRET");
  return await Stripe.webhooks.constructEventAsync(
    await req.text(), signature, secret, 300, Stripe.createSubtleCryptoProvider(),
  );
}

/**
 * Trava de homologação comercial. Enquanto false, a cobrança permanece
 * desligada mesmo que o segredo BILLING_ENABLED esteja ligado.
 * Nenhuma configuração ou segredo é removido.
 */
const BILLING_HOMOLOGATED = false;

/**
 * Chave comercial de liberação. Exige a homologação comercial acima E o
 * segredo BILLING_ENABLED ligado ("true").
 */
export function isBillingEnabled(): boolean {
  if (!BILLING_HOMOLOGATED) return false;
  return (Deno.env.get("BILLING_ENABLED") ?? "").toLowerCase() === "true";
}

/** Ambiente do catálogo ('test' | 'production') a partir do ambiente do Stripe. */
export function catalogEnvironment(env: StripeEnv): "test" | "production" {
  return env === "live" ? "production" : "test";
}

/** Homologação isolada do Lovable, nunca no projeto de produção. */
export function isSandboxBillingEnabled(): boolean {
  const projectRef = Deno.env.get("BILLING_SANDBOX_PROJECT_REF");
  return !!projectRef && /^[a-z0-9]{20}$/.test(projectRef)
    && projectRef !== "rqaiodukllvnrxojhbwq"
    && Deno.env.get("SUPABASE_URL") === `https://${projectRef}.supabase.co`;
}

export function billingEnvironment(): StripeEnv {
  return isSandboxBillingEnabled() ? "sandbox" : "live";
}

export function canProcessBilling(env: StripeEnv): boolean {
  return env === billingEnvironment() && (env === "sandbox" || isBillingEnabled());
}

export function allowedCheckoutReturnUrl(value: unknown): URL | null {
  if (typeof value !== "string" || value.length > 2048) return null;
  try {
    const url = new URL(value);
    const configured = Deno.env.get("PAYMENTS_RETURN_ORIGINS") ?? "";
    const origins = configured.split(",").map((origin) => origin.trim()).filter(Boolean);
    if (!origins.length && billingEnvironment() === "live") {
      origins.push("https://quattor-insight-hub.lovable.app");
    }
    return url.protocol === "https:" && !url.username && !url.password
      && origins.includes(url.origin) ? url : null;
  } catch {
    return null;
  }
}
