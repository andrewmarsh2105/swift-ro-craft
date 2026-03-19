-- Idempotency + diagnostics for Stripe webhooks
CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  stripe_event_id text PRIMARY KEY,
  stripe_event_type text NOT NULL,
  processed_at timestamp with time zone,
  processing_error text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_created_at
  ON public.stripe_webhook_events (created_at DESC);
