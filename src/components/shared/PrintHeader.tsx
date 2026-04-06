import { useFlagContext } from '@/contexts/FlagContext';
import { formatMediumDate } from '@/lib/dateFormatters';

/**
 * Print-only header shown at the top of exported/printed pages.
 * Hidden on screen via CSS (display: none), revealed by @media print (.print-header).
 */
export function PrintHeader({ periodLabel }: { periodLabel?: string }) {
  const { userSettings } = useFlagContext();
  const techName = userSettings.displayName || 'Technician';
  const shopName = userSettings.shopName;
  const now = formatMediumDate(new Date());

  return (
    <div className="print-header hidden" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '2px solid #222', paddingBottom: 8, marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#111' }}>RO Navigator</div>
          {shopName && <div style={{ fontSize: 12, color: '#555' }}>{shopName}</div>}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>{techName}</div>
          {periodLabel && <div style={{ fontSize: 11, color: '#555' }}>{periodLabel}</div>}
          <div style={{ fontSize: 10, color: '#888' }}>Generated {now}</div>
        </div>
      </div>
    </div>
  );
}
