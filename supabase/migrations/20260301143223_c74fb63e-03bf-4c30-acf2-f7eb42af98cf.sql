CREATE TABLE public.support_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.support_requests ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (even unauthenticated visitors)
CREATE POLICY "Anyone can insert support_requests"
  ON public.support_requests
  FOR INSERT
  WITH CHECK (true);

-- Only the user who submitted can see their own (if logged in)
CREATE POLICY "Users select own support_requests"
  ON public.support_requests
  FOR SELECT
  USING (user_id = auth.uid());

-- Deny update/delete
CREATE POLICY "Deny update support_requests"
  ON public.support_requests
  FOR UPDATE
  USING (false);

CREATE POLICY "Deny delete support_requests"
  ON public.support_requests
  FOR DELETE
  USING (false);