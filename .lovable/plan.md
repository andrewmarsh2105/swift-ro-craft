

## Fix 3 Database Security Warnings

### 1. Audit Trail Tampering Risk (`audit_log`)
Add explicit restrictive policies that deny UPDATE and DELETE on `audit_log`, making the audit trail append-only and tamper-proof.

### 2. Premium Feature Exploitation (`pro_overrides`)
Add explicit restrictive policies that deny INSERT, UPDATE, and DELETE on `pro_overrides` from regular users. Only the service role (used by edge functions) should be able to modify this table.

### 3. User Role Self-Elevation (`user_roles`)
Add explicit restrictive policies that deny INSERT, UPDATE, and DELETE on `user_roles` from regular users. Only the service role should manage role assignments.

### Technical Details

A single database migration will add six "deny-all" RLS policies using `false` as the condition:

```sql
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
```

These policies block all authenticated users from performing these operations. The edge functions (which use the service role key) bypass RLS entirely, so admin functionality remains unaffected.

After applying, the 3 security findings will be marked as resolved.

