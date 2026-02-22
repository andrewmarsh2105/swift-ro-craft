
CREATE TABLE public.pro_overrides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pro_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own override"
ON public.pro_overrides
FOR SELECT
USING (user_id = auth.uid());
