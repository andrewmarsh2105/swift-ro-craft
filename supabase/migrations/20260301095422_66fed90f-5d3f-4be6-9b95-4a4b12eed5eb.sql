
-- Add range_type and ro_snapshot columns to pay_period_closeouts
ALTER TABLE public.pay_period_closeouts
  ADD COLUMN IF NOT EXISTS range_type text NOT NULL DEFAULT 'pay_period',
  ADD COLUMN IF NOT EXISTS ro_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb;
