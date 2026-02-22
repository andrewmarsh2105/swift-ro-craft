
-- audit_log: prevent tampering (append-only)
CREATE POLICY "Deny update audit_log" ON public.audit_log FOR UPDATE USING (false);
CREATE POLICY "Deny delete audit_log" ON public.audit_log FOR DELETE USING (false);

-- pro_overrides: prevent user self-grant
CREATE POLICY "Deny insert pro_overrides" ON public.pro_overrides FOR INSERT WITH CHECK (false);
CREATE POLICY "Deny update pro_overrides" ON public.pro_overrides FOR UPDATE USING (false);
CREATE POLICY "Deny delete pro_overrides" ON public.pro_overrides FOR DELETE USING (false);

-- user_roles: prevent self-elevation
CREATE POLICY "Deny insert user_roles" ON public.user_roles FOR INSERT WITH CHECK (false);
CREATE POLICY "Deny update user_roles" ON public.user_roles FOR UPDATE USING (false);
CREATE POLICY "Deny delete user_roles" ON public.user_roles FOR DELETE USING (false);
