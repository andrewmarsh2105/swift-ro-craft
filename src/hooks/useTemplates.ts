import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Json } from '@/integrations/supabase/types';

export interface ROTemplate {
  id: string;
  name: string;
  fieldMapJson: Record<string, string> | null;
  samplePhotoPath: string | null;
  createdAt: string;
  updatedAt: string;
}

export function useTemplates() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<ROTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTemplates = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('ro_templates')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch templates:', error);
    } else {
      setTemplates((data || []).map(t => ({
        id: t.id,
        name: t.name,
        fieldMapJson: t.field_map_json as Record<string, string> | null,
        samplePhotoPath: t.sample_photo_path,
        createdAt: t.created_at,
        updatedAt: t.updated_at,
      })));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const addTemplate = useCallback(async (name: string, fieldMap?: Record<string, string>) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('ro_templates')
      .insert({
        user_id: user.id,
        name,
        field_map_json: (fieldMap || null) as Json,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create template:', error);
      return null;
    }
    await fetchTemplates();
    return data?.id || null;
  }, [user, fetchTemplates]);

  const updateTemplate = useCallback(async (id: string, updates: { name?: string; fieldMap?: Record<string, string> }) => {
    if (!user) return;
    const payload: { name?: string; field_map_json?: Json } = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.fieldMap !== undefined) payload.field_map_json = updates.fieldMap as Json;

    await supabase
      .from('ro_templates')
      .update(payload)
      .eq('id', id)
      .eq('user_id', user.id);

    await fetchTemplates();
  }, [user, fetchTemplates]);

  const deleteTemplate = useCallback(async (id: string) => {
    if (!user) return;
    await supabase
      .from('ro_templates')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    await fetchTemplates();
  }, [user, fetchTemplates]);

  return { templates, loading, addTemplate, updateTemplate, deleteTemplate, refetch: fetchTemplates };
}
