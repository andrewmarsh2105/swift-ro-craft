import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ALL_COLUMNS, type ColumnId } from '@/components/shared/spreadsheet/types';
import { typeCode } from '@/lib/csvUtils';
import { formatVehicleChip } from '@/types/ro';
import type { RepairOrder } from '@/types/ro';

interface FlatRow {
  ro: RepairOrder;
  lineIndex: number;
  roTotal: number;
}

function getPlainValue(colId: ColumnId, row: FlatRow): string {
  const line = row.lineIndex >= 0 ? row.ro.lines[row.lineIndex] : null;
  const laborType = line?.laborType ?? row.ro.laborType;
  switch (colId) {
    case 'roNumber': return row.ro.roNumber;
    case 'date': return row.ro.paidDate || row.ro.date;
    case 'advisor': return row.ro.advisor || '';
    case 'customer': return row.ro.customerName || '';
    case 'vehicle': return formatVehicleChip(row.ro.vehicle) || '';
    case 'lineNo': return String(line ? line.lineNo : 1);
    case 'description': return line ? line.description : (row.ro as any).workPerformed || '';
    case 'hours': return (line ? line.hoursPaid : row.ro.paidHours).toFixed(2);
    case 'type': return typeCode(laborType);
    case 'roTotal': return row.roTotal.toFixed(2);
    case 'tbd': return line?.isTbd ? 'Y' : 'N';
    case 'notes': return row.ro.notes || '';
    case 'mileage': return row.ro.mileage || '';
    case 'vin': return row.ro.vehicle?.vin || '';
    default: return '';
  }
}

export function exportPDF(
  ros: RepairOrder[],
  columns: ColumnId[],
  filename: string,
  title: string,
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // Title
  doc.setFontSize(14);
  doc.text(title, 14, 15);
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`Generated ${format(new Date(), 'MMM d, yyyy h:mm a')}`, 14, 21);
  doc.setTextColor(0);

  // Build flat rows sorted by date
  const sorted = [...ros].sort((a, b) => {
    const aD = a.paidDate || a.date, bD = b.paidDate || b.date;
    return aD.localeCompare(bD) || a.roNumber.localeCompare(b.roNumber);
  });

  const flatRows: FlatRow[] = [];
  for (const ro of sorted) {
    const hasL = ro.lines?.length > 0;
    const roTotal = hasL
      ? ro.lines.filter(l => !l.isTbd).reduce((s, l) => s + l.hoursPaid, 0)
      : ro.paidHours;
    if (hasL) {
      ro.lines.forEach((_, i) => {
        if (!ro.lines[i].isTbd) {
          flatRows.push({ ro, lineIndex: i, roTotal });
        }
      });
    } else {
      flatRows.push({ ro, lineIndex: -1, roTotal });
    }
  }

  // Build table data with day totals
  const headers = columns.map(id => ALL_COLUMNS.find(c => c.id === id)!.label);
  const body: (string | { content: string; styles: Record<string, any> })[][] = [];
  let currentDate = '';
  let dayTotal = 0;

  for (const row of flatRows) {
    const dateKey = (row.ro.paidDate || row.ro.date).slice(0, 10);

    if (currentDate && dateKey !== currentDate) {
      // Day total row
      const totalRow = columns.map(id => {
        if (id === 'date') return { content: currentDate, styles: { fontStyle: 'bold' as const } };
        if (id === 'description') return { content: 'DAY TOTAL', styles: { fontStyle: 'bold' as const } };
        if (id === 'hours') return { content: dayTotal.toFixed(2), styles: { fontStyle: 'bold' as const } };
        return '';
      });
      body.push(totalRow);
      dayTotal = 0;
    }
    currentDate = dateKey;

    const line = row.lineIndex >= 0 ? row.ro.lines[row.lineIndex] : null;
    const hrs = line ? line.hoursPaid : row.ro.paidHours;
    dayTotal += hrs;

    body.push(columns.map(id => getPlainValue(id, row)));
  }

  // Final day total
  if (currentDate) {
    const totalRow = columns.map(id => {
      if (id === 'date') return { content: currentDate, styles: { fontStyle: 'bold' as const } };
      if (id === 'description') return { content: 'DAY TOTAL', styles: { fontStyle: 'bold' as const } };
      if (id === 'hours') return { content: dayTotal.toFixed(2), styles: { fontStyle: 'bold' as const } };
      return '';
    });
    body.push(totalRow);
  }

  // Period total
  const periodTotal = flatRows.reduce((sum, r) => {
    const line = r.lineIndex >= 0 ? r.ro.lines[r.lineIndex] : null;
    return sum + (line ? line.hoursPaid : r.ro.paidHours);
  }, 0);
  const periodRow = columns.map(id => {
    if (id === 'description') return { content: 'PERIOD TOTAL', styles: { fontStyle: 'bold' as const, fillColor: [230, 240, 255] as any } };
    if (id === 'hours') return { content: periodTotal.toFixed(2), styles: { fontStyle: 'bold' as const, fillColor: [230, 240, 255] as any } };
    return { content: '', styles: { fillColor: [230, 240, 255] as any } };
  });
  body.push(periodRow);

  // Render table
  autoTable(doc, {
    head: [headers],
    body,
    startY: 25,
    styles: { fontSize: 7, cellPadding: 1.5, overflow: 'linebreak' },
    headStyles: { fillColor: [50, 50, 50], textColor: 255, fontStyle: 'bold', fontSize: 7 },
    columnStyles: columns.reduce((acc, id, i) => {
      if (id === 'hours' || id === 'roTotal') acc[i] = { halign: 'right' };
      if (id === 'description') acc[i] = { cellWidth: 50 };
      return acc;
    }, {} as Record<number, any>),
    didParseCell: (data) => {
      // Style type column colors
      const colIdx = columns.indexOf('type');
      if (data.section === 'body' && data.column.index === colIdx) {
        const val = typeof data.cell.raw === 'string' ? data.cell.raw : '';
        if (val === 'W') data.cell.styles.textColor = [37, 99, 235];
        else if (val === 'CP') data.cell.styles.textColor = [22, 163, 74];
        else if (val === 'I') data.cell.styles.textColor = [234, 88, 12];
      }
    },
    margin: { left: 10, right: 10 },
  });

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width - 25, doc.internal.pageSize.height - 5);
  }

  doc.save(filename);
}
