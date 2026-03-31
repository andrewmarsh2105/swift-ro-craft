// Re-exports the shared Supabase client so files can import from either path:
//   import { supabase } from './lib/supabase'
//   import { supabase } from '@/integrations/supabase/client'
export { supabase, SUPABASE_URL, SUPABASE_CONFIGURED } from '@/integrations/supabase/client';
