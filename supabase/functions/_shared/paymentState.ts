export function asObject(value:unknown):Record<string,unknown> {
 if(!value||typeof value!=="object"||Array.isArray(value)) throw new Error("Invalid provider object");
 return value as Record<string,unknown>;
}
export function objectId(value:unknown):string|null {
 if(typeof value==="string"&&value) return value;
 if(value&&typeof value==="object"&&"id" in value&&typeof value.id==="string") return value.id;
 return null;
}
function iso(value:unknown):string|null {
 if(typeof value!=="number"||!Number.isFinite(value)) return null;
 return new Date(value*1000).toISOString();
}
export function subscriptionState(value:unknown,environment:"test"|"production") {
 const sub=asObject(value),items=asObject(sub.items),item=asObject((items.data as unknown[])?.[0]),price=asObject(item.price);
 const statusMap:Record<string,"active"|"trial"|"expired"|"cancelled">={
   trialing:"trial",active:"active",past_due:"expired",canceled:"cancelled",unpaid:"expired",
   incomplete:"expired",incomplete_expired:"expired",paused:"expired",
 };
 const status=typeof sub.status==="string"?statusMap[sub.status]??"expired":"expired";
 const current_period_end=iso(item.current_period_end??sub.current_period_end);
 if((status==="active"||status==="trial")&&!current_period_end) throw new Error("Subscription period missing");
 const recurring=price.recurring?asObject(price.recurring):{};
 return {
   status,billing_period:recurring.interval==="year"?"anual":"mensal",
   stripe_subscription_id:objectId(sub),stripe_customer_id:objectId(sub.customer),
   stripe_product_id:objectId(price.product),stripe_price_id:objectId(price),
   current_period_start:iso(item.current_period_start??sub.current_period_start),
   current_period_end,cancel_at_period_end:sub.cancel_at_period_end===true,
   cancelled_at:iso(sub.canceled_at),environment,
 };
}
