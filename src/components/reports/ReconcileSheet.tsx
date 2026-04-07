import { useState, useCallback, useRef } from 'react';
import {
  FileText, Upload, Loader2, CheckCircle2, AlertTriangle,
  Printer, ChevronDown, ChevronUp,
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { BottomSheet } from '@/components/mobile/BottomSheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { supabase, SUPABASE_URL } from '@/integrations/supabase/client';
import { useFlagContext } from '@/contexts/FlagContext';
import { useCloseouts } from '@/hooks/useCloseouts';
import { usePayPeriodReport } from '@/hooks/usePayPeriodReport';
import { formatDateRange } from '@/lib/dateFormatters';
import { exportReconciliationPDF, type ReconciliationRow } from '@/lib/reconciliationPDF';
import type { CloseoutSnapshot } from '@/hooks/useCloseouts';

// ── Types ────────────────────────────────────────────────────────────────────

interface PayStubFields {
  totalHours: string;
  grossPay: string;
  warrantyHours: string;
  customerPayHours: string;
  internalHours: string;
}

const EMPTY_FIELDS: PayStubFields = {
  totalHours: '',
  grossPay: '',
  warrantyHours: '',
  customerPayHours: '',
  internalHours: '',
};

type InputMode = 'manual' | 'upload';
type PeriodMode = 'closeout' | 'custom';

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseNum(s: string): number | null {
  const n = parseFloat(s.replace(/[^0-9.\-]/g, ''));
  return isNaN(n) ? null : n;
}

function fmtHours(h: number): string {
  return `${h % 1 === 0 ? h.toFixed(0) : h.toFixed(2)} hrs`;
}

function fmtMoney(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

function fmtDiffHours(diff: number): string {
  const sign = diff > 0 ? '+' : '';
  return `${sign}${diff % 1 === 0 ? diff.toFixed(0) : diff.toFixed(2)} hrs`;
}

function fmtDiffMoney(diff: number): string {
  const sign = diff > 0 ? '+' : '';
  return `${sign}${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(diff)}`;
}

interface DiscrepancyItem {
  label: string;
  navigatorRaw: number;
  payStubRaw: number;
  diff: number;                   // payStub - navigator
  isShortfall: boolean;           // paid less than tracked
  unit: 'hours' | 'money';
}

function computeDiscrepancies(
  navTotals: { totalHours: number; warrantyHours: number; cpHours: number; internalHours: number },
  hourlyRate: number,
  fields: PayStubFields,
): DiscrepancyItem[] {
  const items: DiscrepancyItem[] = [];
  const TOLERANCE = 0.05;  // ignore sub-0.05hr or $0.05 differences (rounding)

  function check(
    label: string,
    navValue: number,
    stubStr: string,
    unit: 'hours' | 'money',
  ) {
    const stubValue = parseNum(stubStr);
    if (stubValue === null) return;  // not entered — skip
    const diff = stubValue - navValue;
    if (Math.abs(diff) < TOLERANCE) return;  // within tolerance — not a discrepancy
    items.push({
      label,
      navigatorRaw: navValue,
      payStubRaw: stubValue,
      diff,
      isShortfall: diff < 0,  // pay stub is lower = shortfall
      unit,
    });
  }

  check('Total Hours', navTotals.totalHours, fields.totalHours, 'hours');

  const estimatedPay = hourlyRate > 0 ? navTotals.totalHours * hourlyRate : 0;
  if (estimatedPay > 0) {
    check('Estimated Gross Pay', estimatedPay, fields.grossPay, 'money');
  }
  // If hourlyRate is 0, gross pay comparison is not possible — skip silently

  check('Warranty Hours', navTotals.warrantyHours, fields.warrantyHours, 'hours');
  check('Customer-Pay Hours', navTotals.cpHours, fields.customerPayHours, 'hours');
  check('Internal Hours', navTotals.internalHours, fields.internalHours, 'hours');

  return items;
}

// ── Main Component ───────────────────────────────────────────────────────────

interface ReconcileSheetProps {
  open: boolean;
  onClose: () => void;
}

export function ReconcileSheet({ open, onClose }: ReconcileSheetProps) {
  const isMobile = useIsMobile();
  const { userSettings } = useFlagContext();
  const { closeouts } = useCloseouts();

  // Period selection
  const [periodMode, setPeriodMode] = useState<PeriodMode>('closeout');
  const [selectedCloseoutId, setSelectedCloseoutId] = useState<string>('');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // Input mode
  const [inputMode, setInputMode] = useState<InputMode>('manual');
  const [fields, setFields] = useState<PayStubFields>(EMPTY_FIELDS);
  const [uploading, setUploading] = useState(false);
  const [uploadConfidence, setUploadConfidence] = useState<Record<string, number>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  // Results
  const [discrepancies, setDiscrepancies] = useState<DiscrepancyItem[] | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [lowConfidenceWarning, setLowConfidenceWarning] = useState(false);

  // Determine active period
  const selectedCloseout: CloseoutSnapshot | null =
    closeouts.find(c => c.id === selectedCloseoutId) ?? null;

  const activePeriod: { start: string; end: string } | null =
    periodMode === 'closeout' && selectedCloseout
      ? { start: selectedCloseout.periodStart, end: selectedCloseout.periodEnd }
      : periodMode === 'custom' && customStart && customEnd
        ? { start: customStart, end: customEnd }
        : null;

  const report = usePayPeriodReport(
    activePeriod?.start ?? '',
    activePeriod?.end ?? '',
  );

  const navTotals = {
    totalHours: report.totalHours,
    warrantyHours: report.byLaborType.find(lt => lt.laborType === 'warranty')?.totalHours ?? 0,
    cpHours: report.byLaborType.find(lt => lt.laborType === 'customer-pay')?.totalHours ?? 0,
    internalHours: report.byLaborType.find(lt => lt.laborType === 'internal')?.totalHours ?? 0,
  };

  // ── Field helpers ──────────────────────────────────────────────────────────
  function setField(key: keyof PayStubFields, val: string) {
    setFields(prev => ({ ...prev, [key]: val }));
    setDiscrepancies(null);
    setLowConfidenceWarning(false);
  }

  function resetAll() {
    setFields(EMPTY_FIELDS);
    setDiscrepancies(null);
    setUploadConfidence({});
    setShowDetails(false);
    setLowConfidenceWarning(false);
  }

  // ── Upload handler ────────────────────────────────────────────────────────
  const handleUpload = useCallback(async (file: File) => {
    if (!file) return;
    setUploading(true);
    setDiscrepancies(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
      const safeExt = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif', 'pdf'].includes(ext) ? ext : 'jpg';
      const storagePath = `${user.id}/paystubs/${Date.now()}.${safeExt}`;

      const { error: uploadError } = await supabase.storage
        .from('ro-photos')
        .upload(storagePath, file, { contentType: file.type || 'image/jpeg' });

      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) throw new Error('Authentication expired');

      const response = await fetch(`${SUPABASE_URL}/functions/v1/paystub-extract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ storagePath }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'OCR extraction failed');
      }

      const result = await response.json();

      // Populate fields from OCR result
      const patch: Partial<PayStubFields> = {};
      if (result.totalHours != null) patch.totalHours = String(result.totalHours);
      if (result.grossPay != null) patch.grossPay = String(result.grossPay);
      if (result.warrantyHours != null) patch.warrantyHours = String(result.warrantyHours);
      if (result.customerPayHours != null) patch.customerPayHours = String(result.customerPayHours);
      if (result.internalHours != null) patch.internalHours = String(result.internalHours);

      setFields(prev => ({ ...prev, ...patch }));
      setUploadConfidence(result.confidence || {});
      toast.success('Pay stub scanned — review the extracted values below');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Scan failed');
    } finally {
      setUploading(false);
    }
  }, []);

  // ── Compare ───────────────────────────────────────────────────────────────
  function handleCompare() {
    if (!activePeriod) {
      toast.error('Select a pay period first');
      return;
    }

    // Warn if gross pay entered but no hourly rate configured
    const hourlyRate = userSettings.hourlyRate ?? 0;
    if (fields.grossPay.trim() !== '' && hourlyRate === 0) {
      toast.info('Gross pay comparison skipped — set your hourly rate in settings to enable it.');
    }

    // Check for low-confidence OCR fields that are populated
    const LOW_CONFIDENCE_THRESHOLD = 0.5;
    const hasLowConf = inputMode === 'upload' && (Object.keys(fields) as Array<keyof PayStubFields>).some(key => {
      const conf = uploadConfidence[key];
      return fields[key].trim() !== '' && conf != null && conf < LOW_CONFIDENCE_THRESHOLD;
    });
    setLowConfidenceWarning(hasLowConf);

    const disc = computeDiscrepancies(navTotals, hourlyRate, fields);
    setDiscrepancies(disc);
    setShowDetails(true);
  }

  // ── PDF export ─────────────────────────────────────────────────────────────
  function handlePrint() {
    if (discrepancies === null || !activePeriod) return;

    const rows: ReconciliationRow[] = discrepancies.map(d => ({
      label: d.label,
      navigatorValue: d.unit === 'hours' ? fmtHours(d.navigatorRaw) : fmtMoney(d.navigatorRaw),
      payStubValue: d.unit === 'hours' ? fmtHours(d.payStubRaw) : fmtMoney(d.payStubRaw),
      difference: d.unit === 'hours' ? fmtDiffHours(d.diff) : fmtDiffMoney(d.diff),
      isShortfall: d.isShortfall,
    }));

    exportReconciliationPDF({
      technicianName: userSettings.displayName || '',
      shopName: userSettings.shopName || '',
      periodStart: activePeriod.start,
      periodEnd: activePeriod.end,
      rows,
      hasDiscrepancies: discrepancies.length > 0,
    });
  }

  // ── Confidence color ──────────────────────────────────────────────────────
  function confidenceBadge(key: string) {
    const conf = uploadConfidence[key];
    if (conf == null) return null;
    const color = conf >= 0.8 ? 'text-green-600' : conf >= 0.5 ? 'text-amber-600' : 'text-red-600';
    const label = conf >= 0.8 ? 'High' : conf >= 0.5 ? 'Medium' : 'Low';
    return <span className={cn('text-[10px] font-medium', color)}>{label} confidence</span>;
  }

  const canCompare = activePeriod !== null && Object.values(fields).some(v => v.trim() !== '');
  const hasResults = discrepancies !== null;

  // ── Sorted closeouts for picker (most recent first) ───────────────────────
  const sortedCloseouts = [...closeouts]
    .filter(c => c.rangeType !== 'day')
    .sort((a, b) => b.periodEnd.localeCompare(a.periodEnd));

  // ── Render ────────────────────────────────────────────────────────────────
  const content = (
    <div className="flex flex-col gap-5 p-4 pb-8">

      {/* ── Step 1: Period ─────────────────────────────────────────────── */}
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          Step 1 · Select Pay Period
        </h3>
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => { setPeriodMode('closeout'); setDiscrepancies(null); }}
            className={cn(
              'flex-1 py-2 text-sm font-medium rounded-lg border transition-colors',
              periodMode === 'closeout'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card text-muted-foreground border-border hover:border-foreground/30',
            )}
          >
            Closed Period
          </button>
          <button
            onClick={() => { setPeriodMode('custom'); setDiscrepancies(null); }}
            className={cn(
              'flex-1 py-2 text-sm font-medium rounded-lg border transition-colors',
              periodMode === 'custom'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card text-muted-foreground border-border hover:border-foreground/30',
            )}
          >
            Custom Range
          </button>
        </div>

        {periodMode === 'closeout' && (
          sortedCloseouts.length === 0 ? (
            <p className="text-sm text-muted-foreground bg-muted rounded-lg p-3">
              No closed pay periods yet. Close out a period first, or use a custom date range.
            </p>
          ) : (
            <Select value={selectedCloseoutId} onValueChange={v => { setSelectedCloseoutId(v); setDiscrepancies(null); }}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a closed period…" />
              </SelectTrigger>
              <SelectContent>
                {sortedCloseouts.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {formatDateRange(c.periodStart, c.periodEnd)} &nbsp;·&nbsp; {c.totals.totalHours.toFixed(1)} hrs
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )
        )}

        {periodMode === 'custom' && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs mb-1 block">Start date</Label>
              <Input
                type="date"
                value={customStart}
                onChange={e => { setCustomStart(e.target.value); setDiscrepancies(null); }}
              />
            </div>
            <div>
              <Label className="text-xs mb-1 block">End date</Label>
              <Input
                type="date"
                value={customEnd}
                onChange={e => { setCustomEnd(e.target.value); setDiscrepancies(null); }}
              />
            </div>
          </div>
        )}

        {/* RO Navigator summary for selected period */}
        {activePeriod && (
          <div className="mt-3 rounded-lg bg-muted/50 border border-border p-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Stat label="Total Hours" value={navTotals.totalHours.toFixed(2)} />
            <Stat label="Warranty" value={navTotals.warrantyHours.toFixed(2)} />
            <Stat label="Customer Pay" value={navTotals.cpHours.toFixed(2)} />
            <Stat label="Internal" value={navTotals.internalHours.toFixed(2)} />
          </div>
        )}
      </section>

      {/* ── Step 2: Pay stub input ─────────────────────────────────────── */}
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          Step 2 · Enter Pay Stub Values
        </h3>

        <div className="flex gap-2 mb-3">
          <button
            onClick={() => { setInputMode('manual'); resetAll(); }}
            className={cn(
              'flex-1 py-2 text-sm font-medium rounded-lg border transition-colors',
              inputMode === 'manual'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card text-muted-foreground border-border hover:border-foreground/30',
            )}
          >
            Manual Entry
          </button>
          <button
            onClick={() => { setInputMode('upload'); resetAll(); }}
            className={cn(
              'flex-1 py-2 text-sm font-medium rounded-lg border transition-colors',
              inputMode === 'upload'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card text-muted-foreground border-border hover:border-foreground/30',
            )}
          >
            Scan Pay Stub
          </button>
        </div>

        {inputMode === 'upload' && (
          <div className="mb-4">
            <input
              ref={fileRef}
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) handleUpload(file);
                e.target.value = '';
              }}
            />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className={cn(
                'w-full flex flex-col items-center justify-center gap-2 py-6 rounded-xl border-2 border-dashed transition-colors',
                uploading
                  ? 'border-primary/50 bg-primary/5 text-primary/60 cursor-wait'
                  : 'border-border hover:border-primary/50 hover:bg-muted/30 text-muted-foreground cursor-pointer',
              )}
            >
              {uploading ? (
                <>
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="text-sm">Scanning pay stub…</span>
                </>
              ) : (
                <>
                  <Upload className="h-6 w-6" />
                  <span className="text-sm font-medium">Upload pay stub image or PDF</span>
                  <span className="text-xs">JPG, PNG, HEIC, PDF accepted</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Fields — shown for both modes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FieldInput
            label="Total Hours Paid"
            placeholder="e.g. 42.5"
            value={fields.totalHours}
            onChange={v => setField('totalHours', v)}
            badge={inputMode === 'upload' ? confidenceBadge('totalHours') : null}
          />
          <FieldInput
            label="Gross Pay"
            placeholder="e.g. 1850.00"
            value={fields.grossPay}
            onChange={v => setField('grossPay', v)}
            badge={inputMode === 'upload' ? confidenceBadge('grossPay') : null}
            prefix="$"
          />
          <FieldInput
            label="Warranty Hours"
            placeholder="optional"
            value={fields.warrantyHours}
            onChange={v => setField('warrantyHours', v)}
            badge={inputMode === 'upload' ? confidenceBadge('warrantyHours') : null}
          />
          <FieldInput
            label="Customer-Pay Hours"
            placeholder="optional"
            value={fields.customerPayHours}
            onChange={v => setField('customerPayHours', v)}
            badge={inputMode === 'upload' ? confidenceBadge('customerPayHours') : null}
          />
          <FieldInput
            label="Internal Hours"
            placeholder="optional"
            value={fields.internalHours}
            onChange={v => setField('internalHours', v)}
            badge={inputMode === 'upload' ? confidenceBadge('internalHours') : null}
          />
        </div>
      </section>

      {/* ── Compare button ─────────────────────────────────────────────── */}
      <Button
        onClick={handleCompare}
        disabled={!canCompare}
        className="w-full"
        size="lg"
      >
        Compare
      </Button>

      {/* ── Results ────────────────────────────────────────────────────── */}
      {hasResults && (
        <section>
          <button
            onClick={() => setShowDetails(v => !v)}
            className="w-full flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2"
          >
            Results
            {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {showDetails && (
            <>
              {lowConfidenceWarning && (
                <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl px-3 py-3 mb-3">
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800 dark:text-amber-300">
                    One or more scanned values had low OCR confidence. Review the highlighted fields above before relying on these results.
                  </p>
                </div>
              )}
              {discrepancies!.length === 0 ? (
                <div className="flex items-center gap-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl px-4 py-4">
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-green-800 dark:text-green-300">No discrepancies found</p>
                    <p className="text-xs text-green-700 dark:text-green-400 mt-0.5">
                      Your pay stub matches your RO Navigator records.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {discrepancies!.map((d, i) => (
                    <DiscrepancyCard key={i} item={d} />
                  ))}
                </div>
              )}

              {/* Print button */}
              <div className="mt-4 flex justify-end">
                <Button variant="outline" onClick={handlePrint} className="gap-2">
                  <Printer className="h-4 w-4" />
                  Print Reconciliation Report
                </Button>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <BottomSheet isOpen={open} onClose={onClose} title="Pay Stub Reconciliation" fullHeight>
        {content}
      </BottomSheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="px-4 pt-4 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Pay Stub Reconciliation
          </DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}

// ── Small sub-components ─────────────────────────────────────────────────────

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}

interface FieldInputProps {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  badge?: React.ReactNode;
  prefix?: string;
}

function FieldInput({ label, placeholder, value, onChange, badge, prefix }: FieldInputProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <Label className="text-xs">{label}</Label>
        {badge}
      </div>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
            {prefix}
          </span>
        )}
        <Input
          type="number"
          inputMode="decimal"
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          className={cn('w-full', prefix && 'pl-6')}
        />
      </div>
    </div>
  );
}

function DiscrepancyCard({ item }: { item: DiscrepancyItem }) {
  const fmt = item.unit === 'hours' ? fmtHours : fmtMoney;
  const fmtDiff = item.unit === 'hours' ? fmtDiffHours : fmtDiffMoney;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className={cn(
        'flex items-center gap-2 px-3 py-2 border-b border-border',
        item.isShortfall ? 'bg-red-50 dark:bg-red-950/20' : 'bg-amber-50 dark:bg-amber-950/20',
      )}>
        <AlertTriangle className={cn(
          'h-3.5 w-3.5 flex-shrink-0',
          item.isShortfall ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400',
        )} />
        <span className={cn(
          'text-xs font-semibold',
          item.isShortfall ? 'text-red-800 dark:text-red-300' : 'text-amber-800 dark:text-amber-300',
        )}>
          {item.label}
        </span>
        <span className={cn(
          'ml-auto text-xs font-bold tabular-nums',
          item.isShortfall ? 'text-red-700 dark:text-red-400' : 'text-amber-700 dark:text-amber-400',
        )}>
          {fmtDiff(item.diff)}
        </span>
      </div>
      <div className="grid grid-cols-2 divide-x divide-border">
        <div className="px-3 py-2">
          <p className="text-[10px] text-muted-foreground">RO Navigator</p>
          <p className="text-sm font-semibold tabular-nums">{fmt(item.navigatorRaw)}</p>
        </div>
        <div className="px-3 py-2">
          <p className="text-[10px] text-muted-foreground">Pay Stub</p>
          <p className="text-sm font-semibold tabular-nums">{fmt(item.payStubRaw)}</p>
        </div>
      </div>
    </div>
  );
}
