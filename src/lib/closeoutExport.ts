import { buildCSV, csvCell, typeCode } from '@/lib/csvUtils';
import type { CloseoutSnapshot, ROSnapshot, ROSnapshotLine } from '@/hooks/useCloseouts';

type CloseoutExportMode = 'payroll' | 'full';

function sortableDate(value: string): string {
  const match = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!match) return value;
  const [, y, m, d] = match;
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

function syntheticSimpleLine(ro: ROSnapshot): ROSnapshotLine | null {
  if ((ro.lines || []).length > 0 || ro.totalPaidHours <= 0) return null;

  const laborType: ROSnapshotLine['laborType'] =
    ro.wHours > 0 ? 'warranty' : ro.iHours > 0 ? 'internal' : 'customer-pay';

  return {
    lineId: `${ro.roId}-simple`,
    lineNo: 1,
    description: 'Simple entry',
    laborType,
    hours: ro.totalPaidHours,
    isTbd: false,
  };
}

export function buildCloseoutCSV(closeout: CloseoutSnapshot, mode: CloseoutExportMode): string {
  const payrollHeaders = ['RO#', 'Date', 'Advisor', 'Customer', 'Vehicle', 'Work Performed', 'Hours', 'Type'];
  const fullHeaders = [...payrollHeaders, 'Line#', 'Mileage'];
  const headers = mode === 'full' ? fullHeaders : payrollHeaders;

  const sorted = [...(closeout.roSnapshot || [])].sort((a, b) =>
    sortableDate(a.roDate).localeCompare(sortableDate(b.roDate)) || a.roNumber.localeCompare(b.roNumber),
  );

  const csvRows: string[][] = [];
  let currentDate = '';
  let dayTotal = 0;
  let periodTotal = 0;

  for (const ro of sorted) {
    const paidLines = ro.lines.filter(l => !l.isTbd);
    const exportLines = paidLines.length > 0 ? paidLines : (syntheticSimpleLine(ro) ? [syntheticSimpleLine(ro)!] : []);
    if (exportLines.length === 0) continue;

    if (currentDate && ro.roDate !== currentDate) {
      const totalRow = headers.map(h => {
        if (h === 'Date') return csvCell(currentDate);
        if (h === 'Work Performed') return csvCell('DAY TOTAL');
        if (h === 'Hours') return csvCell(dayTotal.toFixed(2));
        return csvCell('');
      });
      csvRows.push(totalRow);
      dayTotal = 0;
    }
    currentDate = ro.roDate;

    exportLines.forEach((l) => {
      dayTotal += l.hours;
      periodTotal += l.hours;
      const base = [
        csvCell(ro.roNumber),
        csvCell(ro.roDate),
        csvCell(ro.advisor),
        csvCell(ro.customerName || ''),
        csvCell(ro.vehicle || ''),
        csvCell(l.description),
        csvCell(l.hours.toFixed(2)),
        csvCell(typeCode(l.laborType)),
      ];
      if (mode === 'full') {
        base.push(csvCell(l.lineNo));
        base.push(csvCell(ro.mileage || ''));
      }
      csvRows.push(base);
    });
  }

  if (currentDate) {
    const totalRow = headers.map(h => {
      if (h === 'Date') return csvCell(currentDate);
      if (h === 'Work Performed') return csvCell('DAY TOTAL');
      if (h === 'Hours') return csvCell(dayTotal.toFixed(2));
      return csvCell('');
    });
    csvRows.push(totalRow);
  }

  const periodRow = headers.map(h => {
    if (h === 'Date') return csvCell(`${closeout.periodStart}\u2013${closeout.periodEnd}`);
    if (h === 'Work Performed') return csvCell('PERIOD TOTAL');
    if (h === 'Hours') return csvCell(periodTotal.toFixed(2));
    return csvCell('');
  });
  csvRows.push(periodRow);

  return buildCSV(headers, csvRows);
}
