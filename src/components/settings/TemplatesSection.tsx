import { useState } from 'react';
import { FileText, Plus, Star, Pencil, Trash2 } from 'lucide-react';
import { useTemplates } from '@/hooks/useTemplates';
import { useFlagContext } from '@/contexts/FlagContext';
import { BottomSheet } from '@/components/mobile/BottomSheet';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function TemplatesSection() {
  const { templates, loading, addTemplate, updateTemplate, deleteTemplate } = useTemplates();
  const { userSettings, updateUserSetting } = useFlagContext();
  const [showEditor, setShowEditor] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [templateHints, setTemplateHints] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const defaultTemplateId = userSettings.defaultTemplateId || null;

  const handleSave = async () => {
    if (!templateName.trim()) return;
    let fieldMap: Record<string, unknown> | undefined;
    if (templateHints.trim()) {
      try {
        fieldMap = JSON.parse(templateHints.trim());
      } catch {
        fieldMap = { extractionHints: templateHints.trim() };
      }
    }

    if (editingId) {
      await updateTemplate(editingId, { name: templateName.trim(), fieldMap: fieldMap || null });
    } else {
      await addTemplate(templateName.trim(), fieldMap);
    }
    setShowEditor(false);
    setEditingId(null);
    setTemplateName('');
    setTemplateHints('');
  };

  const handleEdit = (t: { id: string; name: string; fieldMapJson?: Record<string, unknown> | null }) => {
    setEditingId(t.id);
    setTemplateName(t.name);
    setTemplateHints(
      t.fieldMapJson
        ? (typeof t.fieldMapJson === 'object' && t.fieldMapJson.extractionHints
          ? t.fieldMapJson.extractionHints
          : JSON.stringify(t.fieldMapJson, null, 2))
        : ''
    );
    setShowEditor(true);
  };

  const handleDelete = async (id: string) => {
    await deleteTemplate(id);
    setShowDeleteConfirm(null);
    if (defaultTemplateId === id) {
      updateUserSetting('defaultTemplateId', null);
    }
  };

  const handleSetDefault = (id: string) => {
    updateUserSetting('defaultTemplateId', defaultTemplateId === id ? null : id);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-4">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Scan Templates
        </h3>
        <button
          onClick={() => {
            setEditingId(null);
            setTemplateName('');
            setTemplateHints('');
            setShowEditor(true);
          }}
          className="p-2 tap-target touch-feedback text-primary"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      {loading ? (
        <p className="px-4 text-sm text-muted-foreground">Loading…</p>
      ) : templates.length === 0 ? (
        <p className="px-4 text-sm text-muted-foreground">No templates yet. Create one to guide scan extraction.</p>
      ) : (
        <div className="space-y-2">
          {templates.map(t => (
            <div key={t.id} className="bg-card p-4 rounded-xl flex items-center gap-3">
              <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate flex items-center gap-2">
                  {t.name}
                  {defaultTemplateId === t.id && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-primary/20 text-primary rounded font-semibold">DEFAULT</span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {t.fieldMapJson ? 'Has extraction hints' : 'No hints'} · Updated {new Date(t.updatedAt).toLocaleDateString()}
                </div>
              </div>
              <button onClick={() => handleSetDefault(t.id)} className="p-2 tap-target touch-feedback">
                <Star className={cn('h-4 w-4', defaultTemplateId === t.id ? 'text-primary fill-primary' : 'text-muted-foreground')} />
              </button>
              <button onClick={() => handleEdit(t)} className="p-2 tap-target touch-feedback">
                <Pencil className="h-4 w-4 text-muted-foreground" />
              </button>
              <button onClick={() => setShowDeleteConfirm(t.id)} className="p-2 tap-target touch-feedback text-destructive">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <BottomSheet
        isOpen={showEditor}
        onClose={() => setShowEditor(false)}
        title={editingId ? 'Edit Template' : 'New Template'}
      >
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">Template Name</label>
            <input
              type="text"
              value={templateName}
              onChange={e => setTemplateName(e.target.value)}
              placeholder="e.g., Standard RO Layout"
              className="w-full h-12 px-4 bg-secondary rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Extraction Hints <span className="text-xs text-muted-foreground font-normal">(optional)</span>
            </label>
            <textarea
              value={templateHints}
              onChange={e => setTemplateHints(e.target.value)}
              placeholder={"Describe where fields are on this RO format, e.g.:\n• RO number is top-right\n• Advisor name is below customer info\n• Lines start after \"Labor Operations\""}
              rows={4}
              className="w-full p-4 bg-secondary rounded-xl resize-none text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-[11px] text-muted-foreground mt-1.5">
              These hints help the scanner focus on the right areas of your specific RO format.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowEditor(false)}
              className="flex-1 py-4 bg-secondary rounded-xl font-medium tap-target touch-feedback"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!templateName.trim()}
              className={cn(
                'flex-1 py-4 rounded-xl font-semibold tap-target touch-feedback',
                templateName.trim() ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              )}
            >
              Save
            </button>
          </div>
        </div>
      </BottomSheet>

      <Dialog open={!!showDeleteConfirm} onOpenChange={() => setShowDeleteConfirm(null)}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Delete Template?</DialogTitle>
            <DialogDescription>This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row gap-3">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(null)} className="flex-1">Cancel</Button>
            <Button variant="destructive" onClick={() => showDeleteConfirm && handleDelete(showDeleteConfirm)} className="flex-1">Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
