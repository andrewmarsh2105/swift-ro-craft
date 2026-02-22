CREATE POLICY "Users delete own settings" 
ON public.user_settings 
FOR DELETE 
USING (user_id = auth.uid());