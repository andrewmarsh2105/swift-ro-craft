
-- Add pay period columns to user_settings
ALTER TABLE public.user_settings 
  ADD COLUMN IF NOT EXISTS pay_period_type text NOT NULL DEFAULT 'week',
  ADD COLUMN IF NOT EXISTS pay_period_end_dates integer[] DEFAULT NULL;
