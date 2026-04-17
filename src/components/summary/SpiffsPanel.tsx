import { useMemo, useState } from 'react';
import { PlusCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { buildSpiffReport } from '@/lib/spiffUtils';
import type { RepairOrder } from '@/types/ro';
import type { SaveSettingResult } from '@/hooks/useUserSettings';
import type { SpiffManualEntry, SpiffRule } from '@/types/spiff';

interface Props {
  rosInRange: RepairOrder[];
  startDate: string;
  endDate: string;
  rules: SpiffRule[];
  manualEntries: SpiffManualEntry[];
  onUpdateRules: (rules: SpiffRule[]) => Promise<SaveSettingResult>;
  onUpdateManualEntries: (entries: SpiffManualEntry[]) => Promise<SaveSettingResult>;
}

export function SpiffsPanel({
  rosInRange,
  startDate,
  endDate,
  rules,
  manualEntries,
  onUpdateRules,
  onUpdateManualEntries,
}: Props) {
  const [ruleName, setRuleName] = useState('');
  const [matchText, setMatchText] = useState('');
  const [ruleUnitPay, setRuleUnitPay] = useState('0');
  const [scheduleType, setScheduleType] = useState<'forever' | 'weekly'>('forever');
  const [activeFrom, setActiveFrom] = useState(startDate);
  const [activeTo, setActiveTo] = useState(endDate);

  const [manualLabel, setManualLabel] = useState('');
  const [manualDate, setManualDate] = useState(endDate);
  const [manualRuleId, setManualRuleId] = useState<string>('unlinked');
  const [manualQty, setManualQty] = useState('1');
  const [manualUnitPay, setManualUnitPay] = useState('0');

  const report = useMemo(() => buildSpiffReport({
    ros: rosInRange,
    startDate,
    endDate,
    rules,
    manualEntries,
  }), [rosInRange, startDate, endDate, rules, manualEntries]);

  const addRule = async () => {
    const trimmedName = ruleName.trim();
    const trimmedMatchText = matchText.trim();
    if (!trimmedName || !trimmedMatchText) return;

    const now = new Date().toISOString();
    const next: SpiffRule = {
      id: crypto.randomUUID(),
      name: trimmedName,
      matchText: trimmedMatchText,
      unitPay: Number(ruleUnitPay) || 0,
      scheduleType,
      activeFrom: scheduleType === 'weekly' ? activeFrom : undefined,
      activeTo: scheduleType === 'weekly' ? activeTo : undefined,
      createdAt: now,
      updatedAt: now,
    };
    await onUpdateRules([...rules, next]);
    setRuleName('');
    setMatchText('');
    setRuleUnitPay('0');
  };

  const removeRule = async (id: string) => {
    await onUpdateRules(rules.filter((rule) => rule.id !== id));
  };

  const addManual = async () => {
    const label = manualLabel.trim();
    if (!label || !manualDate) return;

    const selectedRule = rules.find((rule) => rule.id === manualRuleId);
    const now = new Date().toISOString();
    const next: SpiffManualEntry = {
      id: crypto.randomUUID(),
      date: manualDate,
      label,
      ruleId: selectedRule?.id,
      quantity: Math.max(1, Number(manualQty) || 1),
      unitPay: Number(manualUnitPay) || selectedRule?.unitPay || 0,
      createdAt: now,
      updatedAt: now,
    };

    await onUpdateManualEntries([next, ...manualEntries]);
    setManualLabel('');
    setManualQty('1');
    setManualUnitPay('0');
    setManualRuleId('unlinked');
  };

  const removeManual = async (id: string) => {
    await onUpdateManualEntries(manualEntries.filter((entry) => entry.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <Card><CardContent className="pt-5"><p className="text-xs text-muted-foreground">Total Spiff Pay</p><p className="text-2xl font-bold">${report.totalPay.toFixed(2)}</p></CardContent></Card>
        <Card><CardContent className="pt-5"><p className="text-xs text-muted-foreground">Auto Spiffs</p><p className="text-2xl font-bold">{report.totalAutoCount}</p></CardContent></Card>
        <Card><CardContent className="pt-5"><p className="text-xs text-muted-foreground">Manual Spiffs</p><p className="text-2xl font-bold">{report.totalManualCount}</p></CardContent></Card>
        <Card><CardContent className="pt-5"><p className="text-xs text-muted-foreground">Total Items</p><p className="text-2xl font-bold">{report.totalCount}</p></CardContent></Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1.1fr]">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Spiff Rules (Automatic)</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2 md:grid-cols-2">
              <div><Label>Name</Label><Input value={ruleName} onChange={(e) => setRuleName(e.target.value)} placeholder="Ex: Cabin Filter" /></div>
              <div><Label>Match text on RO line</Label><Input value={matchText} onChange={(e) => setMatchText(e.target.value)} placeholder="Ex: cabin filter" /></div>
              <div><Label>Pay per spiff ($)</Label><Input type="number" step="0.01" min="0" value={ruleUnitPay} onChange={(e) => setRuleUnitPay(e.target.value)} /></div>
              <div><Label>Schedule</Label><Select value={scheduleType} onValueChange={(v) => setScheduleType(v as 'forever' | 'weekly')}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="forever">Forever</SelectItem><SelectItem value="weekly">Weekly / Date Range</SelectItem></SelectContent></Select></div>
              {scheduleType === 'weekly' && (
                <>
                  <div><Label>Active from</Label><Input type="date" value={activeFrom} onChange={(e) => setActiveFrom(e.target.value)} /></div>
                  <div><Label>Active to</Label><Input type="date" value={activeTo} onChange={(e) => setActiveTo(e.target.value)} /></div>
                </>
              )}
            </div>
            <Button onClick={addRule} className="gap-2"><PlusCircle className="h-4 w-4" />Add Rule</Button>
            <div className="max-h-72 overflow-auto space-y-2 pr-1">
              {rules.length === 0 && <p className="text-sm text-muted-foreground">No spiff rules yet.</p>}
              {rules.map((rule) => (
                <div key={rule.id} className="rounded-lg border p-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2"><p className="font-medium">{rule.name}</p><Badge variant="secondary">${Number(rule.unitPay).toFixed(2)}</Badge></div>
                    <p className="text-xs text-muted-foreground">Matches: "{rule.matchText}"</p>
                    <p className="text-xs text-muted-foreground">{rule.scheduleType === 'forever' ? 'Always active' : `${rule.activeFrom || '?'} → ${rule.activeTo || '?'}`}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeRule(rule.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Manual Spiff Entries</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-2 md:grid-cols-2">
                <div><Label>Label</Label><Input value={manualLabel} onChange={(e) => setManualLabel(e.target.value)} placeholder="Ex: Walk-in coolant flush upsell" /></div>
                <div><Label>Date</Label><Input type="date" value={manualDate} onChange={(e) => setManualDate(e.target.value)} /></div>
                <div><Label>Linked rule (optional)</Label><Select value={manualRuleId} onValueChange={setManualRuleId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="unlinked">None</SelectItem>{rules.map((rule) => <SelectItem key={rule.id} value={rule.id}>{rule.name}</SelectItem>)}</SelectContent></Select></div>
                <div><Label>Quantity</Label><Input type="number" min="1" step="1" value={manualQty} onChange={(e) => setManualQty(e.target.value)} /></div>
                <div><Label>Pay per item ($)</Label><Input type="number" min="0" step="0.01" value={manualUnitPay} onChange={(e) => setManualUnitPay(e.target.value)} /></div>
              </div>
              <Button onClick={addManual} className="gap-2"><PlusCircle className="h-4 w-4" />Add Manual Spiff</Button>

              <div className="max-h-72 overflow-auto space-y-2 pr-1">
                {manualEntries.length === 0 && <p className="text-sm text-muted-foreground">No manual entries yet.</p>}
                {manualEntries.map((entry) => (
                  <div key={entry.id} className="rounded-lg border p-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{entry.label}</p>
                      <p className="text-xs text-muted-foreground">{entry.date} · Qty {entry.quantity} · ${Number(entry.unitPay || 0).toFixed(2)} each</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeManual(entry.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Spiff Breakdown ({startDate} → {endDate})</CardTitle></CardHeader>
            <CardContent>
              <div className="max-h-72 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-muted-foreground">
                    <tr><th className="text-left py-2">Spiff</th><th className="text-right py-2">Auto</th><th className="text-right py-2">Manual</th><th className="text-right py-2">Pay</th></tr>
                  </thead>
                  <tbody>
                    {report.byRule.map((row) => (
                      <tr key={row.ruleId} className="border-t">
                        <td className="py-2">{row.ruleName}</td>
                        <td className="text-right py-2">{row.autoCount}</td>
                        <td className="text-right py-2">{row.manualCount}</td>
                        <td className="text-right py-2 font-semibold">${row.totalPay.toFixed(2)}</td>
                      </tr>
                    ))}
                    {report.uncategorizedManual.length > 0 && (
                      <tr className="border-t"><td className="py-2">Manual only</td><td className="text-right py-2">—</td><td className="text-right py-2">{report.uncategorizedManual.reduce((sum, item) => sum + item.quantity, 0)}</td><td className="text-right py-2 font-semibold">${report.manualOnlyPay.toFixed(2)}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
