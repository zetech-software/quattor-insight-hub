// Only fields consumed by the existing handlers. These types do not validate
// or change payment processing; runtime hardening remains a separate batch.
export interface StripeSubscriptionPayload {
  id: string;
  status: string;
  customer?: string;
  current_period_start?: number;
  current_period_end?: number;
  cancel_at_period_end?: boolean;
  canceled_at?: number;
  items?: { data?: Array<{
    current_period_start?: number;
    current_period_end?: number;
    price?: { recurring?: { interval?: string }; product?: string; lookup_key?: string; id?: string };
  }> };
}
export interface StripeCheckoutPayload {
  id: string;
  payment_status?: string;
  customer_details?: { email?: string; name?: string };
  customer_email?: string;
  metadata?: { planCode?: string };
  customer?: unknown;
  subscription?: unknown;
}
