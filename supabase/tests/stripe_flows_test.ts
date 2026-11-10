import { createHmac } from "node:crypto";
import assert from "node:assert/strict";

const prod = "rqaiodukllvnrxojhbwq";
const sandbox = "abcdefghijklmnopqrst";
const userId = "33333333-3333-4333-8333-333333333333";
const signing = "whsec_fake_only";
const price = { id: "price_demo", active: true, livemode: false, type: "recurring",
  product: "prod_demo", currency: "brl", unit_amount: 100, recurring: { interval: "month", interval_count: 1 } };
const plan = { code: "demo", stripe_price_id: "price_demo", stripe_product_id: "prod_demo",
  checkout_mode: "subscription", billing_period: "mensal", currency: "brl", amount_cents: 100 };
const metadata = { integration: "quattor", userId, planCode: "demo" };
const item = () => ({ current_period_end: Math.floor(Date.now() / 1000) + 3600, price });
const sub = { id: "sub_demo", livemode: false, customer: "cus_demo", status: "active",
  metadata, latest_invoice: { status: "paid", attempted: true }, items: { data: [item()], has_more: false },
  cancel_at: null, cancel_at_period_end: false };
const session = { id: "cs_demo", livemode: false, url: "https://checkout.stripe.com/demo", mode: "payment",
  status: "complete", payment_status: "unpaid", metadata, client_reference_id: userId,
  line_items: { data: [{ price, quantity: 1 }], has_more: false } };
let lastWrite: Record<string, unknown> | null;
let lastCheckout: URLSearchParams | null;
let lastKey: string | null;
let claimResult = "11111111-1111-4111-8111-111111111111";
let finishStatus: string;
let handlers: ((req: Request) => Promise<Response>)[] = [];
Deno.serve = ((handler: (req: Request) => Promise<Response>) => { handlers.push(handler); }) as typeof Deno.serve;

for (const [key, value] of Object.entries({
  BILLING_SANDBOX_PROJECT_REF: sandbox, SUPABASE_URL: `https://${sandbox}.supabase.co`,
  STRIPE_SANDBOX_API_KEY: "rk_test_fake", LOVABLE_API_KEY: "fake",
  SUPABASE_SERVICE_ROLE_KEY: "fake", BILLING_ENABLED: "true",
  PAYMENTS_SANDBOX_WEBHOOK_SECRET: signing, PAYMENTS_LIVE_WEBHOOK_SECRET: signing,
  PAYMENTS_RETURN_ORIGINS: "https://preview.example.invalid",
})) Deno.env.set(key, value);

globalThis.fetch = (async (input, init) => {
  const url = new URL(input instanceof Request ? input.url : input.toString());
  const json = (value: unknown) => Response.json(value);
  switch (url.pathname) {
    case "/auth/v1/user":
      return json({ id: userId, email: "tester@example.invalid", email_confirmed_at: new Date().toISOString() });
    case "/rest/v1/user_roles": return json([{ role: "client" }]);
    case "/rest/v1/profiles": return json([{ is_active: true }]);
    case "/rest/v1/subscription_plans": return json([plan]);
    case "/rest/v1/stripe_contracts": return json([]);
    case "/rest/v1/rpc/claim_stripe_event": return json(claimResult);
    case "/rest/v1/rpc/finish_stripe_event": {
      const args = JSON.parse(String(init?.body));
      lastWrite = args.p_contract;
      finishStatus = args.p_status;
      return new Response(null, { status: 204 });
    }
    case "/stripe/v1/prices/price_demo": return json(price);
    case "/stripe/v1/checkout/sessions":
      lastCheckout = new URLSearchParams(String(init?.body));
      lastKey = new Headers(init?.headers).get("idempotency-key");
      return json(session);
    case "/stripe/v1/subscriptions/sub_demo": return json(sub);
    case "/stripe/v1/checkout/sessions/cs_demo": return json(session);
    default: throw new Error("Unexpected network path " + url.pathname);
  }
}) as typeof fetch;

await import("../functions/create-checkout/index.ts");
await import("../functions/payments-webhook/index.ts");
const [checkout, webhook] = handlers;
const attempt = "11111111-1111-4111-8111-111111111111";
const checkoutReq = (returnUrl = "https://preview.example.invalid/assinatura", environment = "sandbox", token = "fake") =>
  new Request("http://test/checkout", { method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: JSON.stringify({ returnUrl, environment, planCode: "demo", requestId: attempt, hosted: true }) });
const webhookReq = (type: string, object: unknown, live = false, timestamp = Math.floor(Date.now() / 1000), env = "sandbox") => {
  const payload = JSON.stringify({ id: "evt_demo", type, data: { object }, livemode: live });
  return new Request(`http://test/webhook?env=${env}`, { method: "POST", body: payload,
    headers: { "stripe-signature": `t=${timestamp},v1=${createHmac("sha256", signing).update(`${timestamp}.${payload}`).digest("hex")}` } });
};
const invoice = { parent: { subscription_details: { subscription: "sub_demo" } } };

Deno.test("Checkout requires authentication, exact HTTPS origin and a sandbox price", async () => {
  assert.equal((await checkout(checkoutReq(undefined, "sandbox", ""))).status, 401);
  for (const url of ["http://preview.example.invalid", "https://preview.example.invalid.evil.test",
    "https://user@preview.example.invalid", "https://preview.example.invalid:8443"]) {
    assert.equal((await checkout(checkoutReq(url))).status, 400);
  }
  assert.equal((await checkout(checkoutReq(undefined, "live"))).status, 409);
  price.livemode = true;
  assert.equal((await checkout(checkoutReq())).status, 409);
  assert.equal(lastCheckout, undefined);
  price.livemode = false;
  Deno.env.set("SUPABASE_URL", `https://${prod}.supabase.co`);
  assert.equal((await checkout(checkoutReq(undefined, "live"))).status, 503);
  Deno.env.set("SUPABASE_URL", `https://${sandbox}.supabase.co`);
});

Deno.test("Checkout switches server-selected modes and reuses an attempt id", async () => {
  assert.equal((await checkout(checkoutReq())).status, 200);
  assert.equal(lastCheckout?.get("mode"), "subscription");
  assert.equal(lastCheckout?.get("subscription_data[metadata][userId]"), userId);
  assert.ok(lastKey?.endsWith(attempt));
  plan.checkout_mode = "payment";
  price.type = "one_time";
  assert.equal((await checkout(checkoutReq())).status, 200);
  assert.equal(lastCheckout?.get("mode"), "payment");
  assert.equal(lastCheckout?.get("subscription_data[metadata][userId]"), null);
  plan.checkout_mode = "subscription";
  price.type = "recurring";
});

Deno.test("Signed subscription events reconcile current state across failure, renewal, stale events and cancellation", async () => {
  assert.equal((await webhook(webhookReq("invoice.paid", invoice, true))).status, 400);
  assert.equal((await webhook(webhookReq("invoice.paid", invoice, false, 100))).status, 400);
  assert.equal((await webhook(webhookReq("invoice.paid", invoice, true, undefined, "live"))).status, 503);
  assert.equal((await webhook(webhookReq("invoice.paid", invoice))).status, 200);
  assert.equal(lastWrite?.status, "active");
  assert.ok(lastWrite?.access_until);
  sub.status = "past_due";
  assert.equal((await webhook(webhookReq("invoice.payment_failed", invoice))).status, 200);
  assert.equal(lastWrite?.status, "past_due");
  assert.equal(lastWrite?.access_until, null);
  sub.status = "active";
  sub.items.data[0].current_period_end += 3600;
  assert.equal((await webhook(webhookReq("invoice.payment_failed", invoice))).status, 200);
  assert.equal(lastWrite?.status, "active");
  sub.cancel_at_period_end = true;
  assert.equal((await webhook(webhookReq("customer.subscription.updated", sub))).status, 200);
  assert.equal(lastWrite?.cancel_at_period_end, true);
  assert.ok(lastWrite?.access_until);
  sub.status = "canceled";
  assert.equal((await webhook(webhookReq("customer.subscription.deleted", sub))).status, 200);
  assert.equal(lastWrite?.status, "canceled");
  assert.equal(lastWrite?.access_until, null);
  claimResult = "busy";
  assert.equal((await webhook(webhookReq("invoice.paid", invoice))).status, 503);
  claimResult = "duplicate";
  assert.equal((await (await webhook(webhookReq("invoice.paid", invoice))).json()).duplicate, true);
  claimResult = "11111111-1111-4111-8111-111111111111";
});

Deno.test("Only confirmed one-time payment creates course entitlement", async () => {
  plan.checkout_mode = "payment";
  price.type = "one_time";
  assert.equal((await webhook(webhookReq("checkout.session.completed", session))).status, 200);
  assert.equal(lastWrite === null, true);
  assert.equal((await webhook(webhookReq("checkout.session.async_payment_failed", session))).status, 200);
  assert.equal(lastWrite === null, true);
  session.payment_status = "paid";
  assert.equal((await webhook(webhookReq("checkout.session.async_payment_succeeded", session))).status, 200);
  assert.equal(lastWrite?.status, "paid");
  assert.equal(lastWrite?.mode, "payment");
  assert.equal(finishStatus, "processado");
});
