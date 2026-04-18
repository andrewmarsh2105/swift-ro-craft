import { useMemo, useState } from 'react';
import { AlertTriangle, PlusCircle, ShieldCheck, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { buildSpiffReport, buildSpiffRulePreview, findLikelySpiffRuleOverlaps } from '@/lib/spiffUtils';
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

  const previewRule = useMemo<SpiffRule>(() => ({
    id: 'preview',
    name: ruleName.trim() || 'Preview',
    matchText,
    unitPay: Number(ruleUnitPay) || 0,
    scheduleType,
    activeFrom: scheduleType === 'weekly' ? activeFrom : undefined,
    activeTo: scheduleType === 'weekly' ? activeTo : undefined,
    createdAt: '',
    updatedAt: '',
  }), [ruleName, matchText, ruleUnitPay, scheduleType, activeFrom, activeTo]);

  const previewStats = useMemo(
    () => buildSpiffRulePreview({ rule: previewRule, ros: rosInRange, startDate, endDate }),
    [previewRule, rosInRange, startDate, endDate],
  );

  const overlapMap = useMemo(() => findLikelySpiffRuleOverlaps(rules), [rules]);
  const previewOverlapCount = useMemo(() => {
    if (!previewRule.matchText.trim()) return 0;
    const virtualRule: SpiffRule = { ...previewRule, id: '__preview__' };
    const overlaps = findLikelySpiffRuleOverlaps([...rules, virtualRule]);
    return overlaps.get('__preview__')?.size || 0;
  }, [previewRule, rules]);

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
    <div className="space-y-4 sm:space-y-5">
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 sm:gap-3">
        <Card className="brand-panel border-primary/20 bg-gradient-to-b from-primary/8 to-card">
          <CardContent className="px-3.5 py-3.5 sm:px-4 sm:py-4">
            <p className="text-[11px] font-medium uppercase tracking-wide text-primary/80">Total Spiff Pay</p>
            <p className="mt-1 text-xl font-bold leading-tight sm:text-2xl">${report.totalPay.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card className="brand-panel border-primary/10 bg-card">
          <CardContent className="px-3.5 py-3.5 sm:px-4 sm:py-4">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Auto Spiffs</p>
            <p className="mt-1 text-xl font-bold leading-tight sm:text-2xl">{report.totalAutoCount}</p>
          </CardContent>
        </Card>
        <Card className="brand-panel border-primary/10 bg-card">
          <CardContent className="px-3.5 py-3.5 sm:px-4 sm:py-4">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Manual Spiffs</p>
            <p className="mt-1 text-xl font-bold leading-tight sm:text-2xl">{report.totalManualCount}</p>
          </CardContent>
        </Card>
        <Card className="brand-panel border-primary/10 bg-card">
          <CardContent className="px-3.5 py-3.5 sm:px-4 sm:py-4">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Total Items</p>
            <p className="mt-1 text-xl font-bold leading-tight sm:text-2xl">{report.totalCount}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1.05fr]">
        <Card className="brand-panel border-primary/15">
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-base">Spiff Rules (Automatic)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3.5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Name</Label>
                <Input value={ruleName} onChange={(e) => setRuleName(e.target.value)} placeholder="Ex: Cabin Filter" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Match text on RO line</Label>
                <Input value={matchText} onChange={(e) => setMatchText(e.target.value)} placeholder="Ex: cabin filter, cabin air filter" />
                <p className="text-xs text-muted-foreground">Use commas for aliases/keywords. Rule matches any alias.</p>
              </div>
              <div className="space-y-1.5">
                <Label>Pay per spiff ($)</Label>
                <Input type="number" step="0.01" min="0" value={ruleUnitPay} onChange={(e) => setRuleUnitPay(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Schedule</Label>
                <Select value={scheduleType} onValueChange={(v) => setScheduleType(v as 'forever' | 'weekly')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="forever">Forever</SelectItem>
                    <SelectItem value="weekly">Weekly / Date Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {scheduleType === 'weekly' && (
                <>
                  <div className="space-y-1.5">
                    <Label>Active from</Label>
                    <Input type="date" value={activeFrom} onChange={(e) => setActiveFrom(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Active to</Label>
                    <Input type="date" value={activeTo} onChange={(e) => setActiveTo(e.target.value)} />
                  </div>
                </>
              )}
            </div>
            <div className="rounded-xl border border-primary/15 bg-primary/5 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold">Rule preview</p>
                <Badge variant="outline" className="ml-auto">{previewStats.lineCount} matching lines</Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Matches {previewStats.roCount} ROs in {startDate} → {endDate}.
              </p>
              {previewStats.sampleDescriptions.length > 0 && (
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {previewStats.sampleDescriptions.map((sample) => (
                    <li key={sample} className="truncate">• {sample}</li>
                  ))}
                </ul>
              )}
              {previewOverlapCount > 0 && (
                <p className="mt-2 flex items-center gap-1 text-xs font-medium text-amber-700">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  This rule may overlap with {previewOverlapCount} existing {previewOverlapCount === 1 ? 'rule' : 'rules'}.
                </p>
              )}
            </div>
            <Button onClick={addRule} className="w-full gap-2 sm:w-auto">
              <PlusCircle className="h-4 w-4" />
              Add Rule
            </Button>
            <div className="max-h-72 overflow-auto space-y-2 pr-1">
              {rules.length === 0 && <p className="text-sm text-muted-foreground">No spiff rules yet.</p>}
              {rules.map((rule) => (
                <div key={rule.id} className="rounded-xl border border-border/75 bg-gradient-to-b from-card to-accent/25 p-3 sm:p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium leading-snug break-words">{rule.name}</p>
                        <Badge variant="secondary" className="shrink-0">${Number(rule.unitPay).toFixed(2)}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground break-words">Matches: "{rule.matchText}"</p>
                      <p className="text-xs text-muted-foreground">{rule.scheduleType === 'forever' ? 'Always active' : `${rule.activeFrom || '?'} → ${rule.activeTo || '?'}`}</p>
                      {(overlapMap.get(rule.id)?.size || 0) > 0 && (
                        <p className="text-xs font-medium text-amber-700">
                          May overlap with {overlapMap.get(rule.id)?.size} other {(overlapMap.get(rule.id)?.size || 0) === 1 ? 'rule' : 'rules'}.
                        </p>
                      )}
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 self-start" onClick={() => removeRule(rule.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="brand-panel border-primary/15">
            <CardHeader className="pb-2 sm:pb-3">
              <CardTitle className="text-base">Manual Spiff Entries</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3.5">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Label</Label>
                  <Input value={manualLabel} onChange={(e) => setManualLabel(e.target.value)} placeholder="Ex: Walk-in coolant flush upsell" />
                </div>
                <div className="space-y-1.5">
                  <Label>Date</Label>
                  <Input type="date" value={manualDate} onChange={(e) => setManualDate(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Linked rule (optional)</Label>
                  <Select value={manualRuleId} onValueChange={setManualRuleId}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unlinked">None</SelectItem>
                      {rules.map((rule) => <SelectItem key={rule.id} value={rule.id}>{rule.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Quantity</Label>
                  <Input type="number" min="1" step="1" value={manualQty} onChange={(e) => setManualQty(e.target.value)} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Pay per item ($)</Label>
                  <Input type="number" min="0" step="0.01" value={manualUnitPay} onChange={(e) => setManualUnitPay(e.target.value)} />
                </div>
              </div>
              <Button onClick={addManual} className="w-full gap-2 sm:w-auto">
                <PlusCircle className="h-4 w-4" />
                Add Manual Spiff
              </Button>

              <div className="max-h-72 overflow-auto space-y-2 pr-1">
                {manualEntries.length === 0 && <p className="text-sm text-muted-foreground">No manual entries yet.</p>}
                {manualEntries.map((entry) => (
                  <div key={entry.id} className="rounded-xl border border-border/75 bg-gradient-to-b from-card to-accent/25 p-3 sm:p-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 space-y-1">
                        <p className="font-medium leading-snug break-words">{entry.label}</p>
                        <p className="text-xs text-muted-foreground break-words">{entry.date} · Qty {entry.quantity} · ${Number(entry.unitPay || 0).toFixed(2)} each</p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 self-start" onClick={() => removeManual(entry.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/15">
            <CardHeader className="pb-2 sm:pb-3">
              <CardTitle className="text-base">Spiff Breakdown ({startDate} → {endDate})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2.5 sm:hidden">
                {report.byRule.map((row) => (
                  <div key={row.ruleId} className="rounded-xl border border-border/80 bg-card/80 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-medium leading-snug break-words">{row.ruleName}</p>
                      <p className="text-sm font-semibold shrink-0">${row.totalPay.toFixed(2)}</p>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <p>Auto: <span className="font-semibold text-foreground">{row.autoCount}</span></p>
                      <p className="text-right">Manual: <span className="font-semibold text-foreground">{row.manualCount}</span></p>
                    </div>
                  </div>
                ))}
                {report.uncategorizedManual.length > 0 && (
                  <div className="rounded-xl border border-border/80 bg-card/80 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-medium leading-snug">Manual only</p>
                      <p className="text-sm font-semibold shrink-0">${report.manualOnlyPay.toFixed(2)}</p>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <p>Auto: <span className="font-semibold text-foreground">—</span></p>
                      <p className="text-right">Manual: <span className="font-semibold text-foreground">{report.uncategorizedManual.reduce((sum, item) => sum + item.quantity, 0)}</span></p>
                    </div>
                  </div>
                )}
                {report.byRule.length === 0 && report.uncategorizedManual.length === 0 && (
                  <p className="text-sm text-muted-foreground">No spiffs in this range.</p>
                )}
              </div>

              <div className="hidden max-h-80 overflow-auto sm:block">
                <table className="w-full text-sm">
                  <thead className="text-xs text-muted-foreground">
                    <tr><th className="text-left py-2.5">Spiff</th><th className="text-right py-2.5">Auto</th><th className="text-right py-2.5">Manual</th><th className="text-right py-2.5">Pay</th></tr>
                  </thead>
                  <tbody>
                    {report.byRule.map((row) => (
                      <tr key={row.ruleId} className="border-t border-border/60">
                        <td className="py-2.5 pr-2">{row.ruleName}</td>
                        <td className="text-right py-2.5 tabular-nums">{row.autoCount}</td>
                        <td className="text-right py-2.5 tabular-nums">{row.manualCount}</td>
                        <td className="text-right py-2.5 font-semibold tabular-nums">${row.totalPay.toFixed(2)}</td>
                      </tr>
                    ))}
                    {report.uncategorizedManual.length > 0 && (
                      <tr className="border-t border-border/60"><td className="py-2.5">Manual only</td><td className="text-right py-2.5">—</td><td className="text-right py-2.5 tabular-nums">{report.uncategorizedManual.reduce((sum, item) => sum + item.quantity, 0)}</td><td className="text-right py-2.5 font-semibold tabular-nums">${report.manualOnlyPay.toFixed(2)}</td></tr>
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
