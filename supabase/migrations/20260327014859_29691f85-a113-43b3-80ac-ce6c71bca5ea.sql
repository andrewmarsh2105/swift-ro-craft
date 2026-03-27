ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS hours_goal_daily numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hours_goal_weekly numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hourly_rate numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS display_name text DEFAULT '',
  ADD COLUMN IF NOT EXISTS shop_name text DEFAULT '';