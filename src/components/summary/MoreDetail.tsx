import { Flag } from 'lucide-react';
import { maskHours } from '@/lib/maskHours';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface LaborTypeData {
  laborType: string;
  label: string;
  lineCount: number;
  totalHours: number;
}

interface LaborRefData {
  referenceId: string;
  referenceName: string;
  lineCount: number;
  totalHours: number;
}

interface MoreDetailProps {
  byLaborType: LaborTypeData[];
  byLaborRef: LaborRefData[];
  flaggedCount: number;
  hideTotals: boolean;
}

export function MoreDetail({ byLaborType, byLaborRef, flaggedCount, hideTotals }: MoreDetailProps) {
  return (
    <Accordion type="single" collapsible>
      <AccordionItem value="more" className="border border-border/40 bg-card overflow-hidden" style={{ borderRadius: 'var(--radius)' }}>
        <AccordionTrigger className="px-4 py-2 text-xs font-semibold text-muted-foreground/60 hover:no-underline">
          More Detail
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-4 space-y-4">
          <div className="space-y-1.5">
            <h4 className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.12em]">Hours by Labor Type</h4>
            {byLaborType.map(lt => (
              <div key={lt.laborType} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
                <span className="text-xs text-foreground font-medium">{lt.label}</span>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-muted-foreground">{lt.lineCount} lines</span>
                  <span className="text-xs font-bold tabular-nums">{maskHours(lt.totalHours, hideTotals)}h</span>
                </div>
              </div>
            ))}
          </div>

          {byLaborRef.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.12em]">By Reference / Preset</h4>
              {byLaborRef.map(r => (
                <div key={r.referenceId} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
                  <span className="text-xs text-foreground font-medium">{r.referenceName}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-muted-foreground">{r.lineCount} lines</span>
                    <span className="text-xs font-bold tabular-nums">{maskHours(r.totalHours, hideTotals)}h</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {flaggedCount > 0 && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg border border-orange-200 bg-orange-50/80">
              <Flag className="h-3.5 w-3.5 text-orange-500 flex-shrink-0" />
              <span className="text-xs font-medium text-orange-800">{flaggedCount} flagged item{flaggedCount !== 1 ? 's' : ''} in this range</span>
            </div>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
