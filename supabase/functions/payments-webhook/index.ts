import { createClient } from "npm:@supabase/supabase-js@2.118.0";
import {type StripeEnv,catalogEnvironment,createStripeClient,isBillingEnabled,verifyWebhook} from "../_shared/stripe.ts";
import {provisionClient} from "../_shared/provisionClient.ts";
import {asObject,objectId,subscriptionState} from "../_shared/paymentState.ts";

Deno.serve(async(req)=>{
 const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json"}});
 if(req.method!=="POST") return json({error:"Method not allowed"},405);
 const env=new URL(req.url).searchParams.get("env");
 if(env!=="sandbox"&&env!=="live") return json({error:"Invalid environment"},400);
 const stripeEnv:StripeEnv=env,environment=catalogEnvironment(stripeEnv);
 const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
 let event:Awaited<ReturnType<typeof verifyWebhook>>;
 try {event=await verifyWebhook(req,stripeEnv);}
 catch {return json({error:"Invalid webhook signature"},400);}
 if(typeof event.id!=="string"||typeof event.type!=="string"||event.livemode!==(env==="live")) return json({error:"Invalid event"},400);
 let token:string|null=null;
 const finish=async(status:string,error:string|null=null)=>{
   const result=await db.from("payment_events").update({status,error,processed_at:new Date().toISOString(),lease_until:null})
     .eq("event_id",event.id).eq("processing_token",token).select("id").single();
   if(result.error||!result.data) throw new Error("Event finalization failed");
 };
 try {
   const claim=await db.rpc("claim_payment_event",{_event_id:event.id,_event_type:event.type,_environment:environment,_payload:event});
   if(claim.error) throw new Error("Event reservation failed");
   token=claim.data?.token;
   if(!token) return json({received:true,duplicate:true},["processado","recusado","ignorado"].includes(claim.data?.status)?200:503);
   if(!isBillingEnabled()) {await finish("ignorado");return json({received:true,billing:"disabled"});}
   const stripe=createStripeClient(stripeEnv);
   const object=asObject(event.data.object);
   const reconcile=async(id:string)=>{
     // Always read canonical provider state; delayed notifications cannot restore an old status.
     const current=await stripe.subscriptions.retrieve(id);
     const patch=subscriptionState(current,environment);
     const result=await db.from("subscriptions").update(patch).eq("stripe_subscription_id",id).eq("environment",environment).select("id");
     if(result.error||!result.data?.length) throw new Error("Subscription not ready for reconciliation");
   };
   if(["checkout.session.completed","checkout.session.async_payment_succeeded"].includes(event.type)) {
     if(object.payment_status==="paid"||object.payment_status==="no_payment_required") {
       const details=object.customer_details?asObject(object.customer_details):{};
       const email=details.email??object.customer_email;
       const subscriptionId=objectId(object.subscription);
       if(typeof email!=="string"||!subscriptionId) throw new Error("Checkout identity missing");
       const current=await stripe.subscriptions.retrieve(subscriptionId);
       const patch=subscriptionState(current,environment);
       const metadata=object.metadata?asObject(object.metadata):{};
       await provisionClient({
         email,fullName:typeof details.name==="string"?details.name:null,
         planCode:typeof metadata.planCode==="string"?metadata.planCode:null,environment,
         stripeCustomerId:patch.stripe_customer_id,stripeSubscriptionId:subscriptionId,
         stripeProductId:patch.stripe_product_id,stripePriceId:patch.stripe_price_id,
         currentPeriodStart:patch.current_period_start,currentPeriodEnd:patch.current_period_end,status:patch.status,
       });
       await reconcile(subscriptionId);
     }
   } else if(event.type.startsWith("customer.subscription.")) {
     const id=objectId(object);if(!id) throw new Error("Subscription ID missing");await reconcile(id);
   } else if(event.type==="invoice.paid"||event.type==="invoice.payment_failed") {
     const parent=object.parent?asObject(object.parent):{};
     const details=parent.subscription_details?asObject(parent.subscription_details):{};
     const id=objectId(object.subscription??details.subscription);
     if(id) await reconcile(id);
   }
   await finish("processado");
   return json({received:true});
 } catch(e) {
   const internal=e instanceof Error&&"code" in e&&e.code==="INTERNAL_ACCOUNT";
   if(token) {
     try {await finish(internal?"recusado":"falha",internal?"Internal account refused":"Processing failed; retry required");}
     catch {console.error("Webhook recovery state could not be persisted",event.id);}
   }
   console.error("Webhook processing failed",event.id);
   return json({error:"Processing failed"},internal?200:500);
 }
});
