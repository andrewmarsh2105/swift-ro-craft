
-- Create advisors table
CREATE TABLE public.advisors (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Unique constraint on (user_id, lower(name))
CREATE UNIQUE INDEX advisors_user_id_name_unique ON public.advisors (user_id, lower(name));

-- Enable RLS
ALTER TABLE public.advisors ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users select own advisors" ON public.advisors FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users insert own advisors" ON public.advisors FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own advisors" ON public.advisors FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users delete own advisors" ON public.advisors FOR DELETE USING (user_id = auth.uid());

-- Seed from existing RO data
INSERT INTO public.advisors (user_id, name)
SELECT DISTINCT user_id, advisor_name
FROM public.ros
WHERE advisor_name IS NOT NULL AND advisor_name != ''
ON CONFLICT DO NOTHING;
