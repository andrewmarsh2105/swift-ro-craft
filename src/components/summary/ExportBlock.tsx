import { Download, Copy, FileText, ChevronDown, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface ExportBlockProps {
  isDesktop: boolean;
  isPro: boolean;
  onCopySummary: () => void;
  onExportCSV: () => void;
  onShowProofPack: () => void;
  onOpenUpgrade: () => void;
}

export function ExportBlock({ isDesktop, isPro, onCopySummary, onExportCSV, onShowProofPack, onOpenUpgrade }: ExportBlockProps) {
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

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className={cn('h-10 cursor-pointer text-sm gap-1.5', isDesktop ? 'w-auto' : '')}>
              <Download className="h-4 w-4" />
              Export
              <ChevronDown className="h-3 w-3 opacity-40" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            {isPro && (
              <>
                <DropdownMenuItem onClick={onShowProofPack}>
                  <FileText className="h-4 w-4 mr-2" />
                  Proof Pack
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem onClick={() => {
              if (!isPro) {
                onOpenUpgrade();
                return;
              }
              onExportCSV();
            }}>
              <Download className="h-4 w-4 mr-2" />
              Lines CSV (paid only)
              {!isPro && <Lock className="h-3 w-3 ml-auto text-muted-foreground" />}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <p className="text-[10px] text-muted-foreground/60">
        Exports use the selected range · Only paid ROs included
      </p>
    </div>
  );
}
