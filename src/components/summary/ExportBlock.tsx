import { Copy, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ExportBlockProps {
  isDesktop: boolean;
  isPro: boolean;
  onCopySummary: () => void;
  onShowProofPack: () => void;
}

export function ExportBlock({ isDesktop, isPro, onCopySummary, onShowProofPack }: ExportBlockProps) {
  return (
    <div className="space-y-2">
      <div className={cn('flex gap-2', isDesktop ? '' : 'w-full')}>
        <Button
          variant="outline"
          className={cn('h-10 cursor-pointer text-sm gap-2 font-semibold', isDesktop ? '' : 'flex-1')}
          onClick={onCopySummary}
          title="Copy summary to clipboard"
        >
          <Copy className="h-4 w-4" />
          Copy
        </Button>

        {isPro && (
          <Button variant="outline" className={cn('h-10 cursor-pointer text-sm gap-1.5', isDesktop ? 'w-auto' : '')} onClick={onShowProofPack}>
            <FileText className="h-4 w-4" />
            Proof Pack
          </Button>
        )}
      </div>
      <p className="text-[10px] text-muted-foreground/60">
        Downloadable export moved to Spreadsheet → Export PDF
      </p>
    </div>
  );
}
