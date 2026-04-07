/**
 * Generates a printable pay stub reconciliation PDF.
 * Only discrepancies are shown — matching items are omitted.
 * Portrait A4, clean white background, print-friendly.
 */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

export interface ReconciliationRow {
  label: string;
  navigatorValue: string;   // formatted display string (e.g. "42.5 hrs")
  payStubValue: string;
  difference: string;       // e.g. "-2.5 hrs" or "-$120.00"
  isShortfall: boolean;     // payStub < navigator (paid less than tracked)
}

export interface ReconciliationReportInput {
  technicianName: string;
  shopName: string;
  periodStart: string;      // YYYY-MM-DD
  periodEnd: string;        // YYYY-MM-DD
  rows: ReconciliationRow[];
  hasDiscrepancies: boolean;
}

function fmtDate(d: string): string {
  try {
    const [y, m, day] = d.split('-').map(Number);
    return format(new Date(y, m - 1, day), 'MMM d, yyyy');
  } catch { return d; }
}

export function exportReconciliationPDF(input: ReconciliationReportInput): void {
  const { technicianName, shopName, periodStart, periodEnd, rows, hasDiscrepancies } = input;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.width;
  const margin = 18;
  let y = margin;

  // ── Header bar ──────────────────────────────────────────────────────────────
  doc.setFillColor(30, 41, 59);  // slate-800
  doc.rect(0, 0, pageW, 22, 'F');

  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('Pay Stub Reconciliation Report', margin, 14);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(180, 180, 180);
  doc.text(`Generated ${format(new Date(), 'MMM d, yyyy h:mm a')}`, pageW - margin, 14, { align: 'right' });

  y = 32;

  // ── Technician / period meta ─────────────────────────────────────────────
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  doc.setFont('helvetica', 'bold');
  doc.text('Technician:', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.text(technicianName || '—', margin + 28, y);

  if (shopName) {
    doc.setFont('helvetica', 'bold');
    doc.text('Shop:', margin + 90, y);
    doc.setFont('helvetica', 'normal');
    doc.text(shopName, margin + 103, y);
  }

  y += 7;
  doc.setFont('helvetica', 'bold');
  doc.text('Pay Period:', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.text(`${fmtDate(periodStart)} – ${fmtDate(periodEnd)}`, margin + 28, y);

  y += 10;

  // ── Divider ──────────────────────────────────────────────────────────────
  doc.setDrawColor(220, 220, 220);
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  // ── Discrepancy section ──────────────────────────────────────────────────
  if (!hasDiscrepancies || rows.length === 0) {
    // No discrepancies — green banner
    doc.setFillColor(240, 253, 244);  // green-50
    doc.setDrawColor(134, 239, 172);  // green-300
    doc.roundedRect(margin, y, pageW - margin * 2, 18, 3, 3, 'FD');

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(22, 101, 52);  // green-800
    doc.text('No Discrepancies Found', pageW / 2, y + 7, { align: 'center' });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(21, 128, 61);  // green-700
    doc.text('Your pay stub matches your RO Navigator records for this period.', pageW / 2, y + 13, { align: 'center' });
    y += 24;
  } else {
    // Discrepancy count badge
    doc.setFillColor(254, 242, 242);  // red-50
    doc.setDrawColor(252, 165, 165);  // red-300
    doc.roundedRect(margin, y, pageW - margin * 2, 14, 2, 2, 'FD');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(185, 28, 28);  // red-700
    const discLabel = rows.length === 1 ? '1 Discrepancy Found' : `${rows.length} Discrepancies Found`;
    doc.text(`! ${discLabel}`, margin + 6, y + 9);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(220, 38, 38);
    doc.text('Items where your pay stub does not match your RO Navigator records.', margin + 6, y + 14.5);
    y += 20;

    // ── Discrepancy table ──────────────────────────────────────────────────
    const tableBody = rows.map(row => [
      row.label,
      row.navigatorValue,
      row.payStubValue,
      row.difference,
    ]);

    autoTable(doc, {
      head: [['Item', 'RO Navigator', 'Your Pay Stub', 'Difference']],
      body: tableBody,
      startY: y,
      margin: { left: margin, right: margin },
      styles: {
        fontSize: 9,
        cellPadding: { top: 4, bottom: 4, left: 5, right: 5 },
        valign: 'middle',
        lineColor: [230, 230, 230],
        lineWidth: 0.2,
      },
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 8.5,
        halign: 'left',
      },
      columnStyles: {
        0: { cellWidth: 60, fontStyle: 'bold' },
        1: { halign: 'right', cellWidth: 38 },
        2: { halign: 'right', cellWidth: 38 },
        3: { halign: 'right', cellWidth: 38, fontStyle: 'bold' },
      },
      didParseCell(data) {
        if (data.section === 'body' && data.column.index === 3) {
          const row = rows[data.row.index];
          if (row) {
            // Shortfall = paid less than tracked → red
            // Overpayment = paid more than tracked → orange/amber
            data.cell.styles.textColor = row.isShortfall ? [185, 28, 28] : [180, 83, 9];
          }
        }
        // Zebra stripe
        if (data.section === 'body' && data.row.index % 2 === 1) {
          data.cell.styles.fillColor = [249, 250, 251];
        }
      },
    });

    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // ── Explanation note ──────────────────────────────────────────────────────
  if (hasDiscrepancies && rows.length > 0) {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(120, 120, 120);
    const note = 'A negative difference means your pay stub shows fewer hours/pay than your RO Navigator records. ' +
      'Bring this report to your shop owner or payroll department for review.';
    const noteLines = doc.splitTextToSize(note, pageW - margin * 2);
    doc.text(noteLines, margin, y);
    y += noteLines.length * 4 + 6;
  }

  // ── Footer line ───────────────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, doc.internal.pageSize.height - 12, pageW - margin, doc.internal.pageSize.height - 12);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150, 150, 150);
    doc.text('RO Navigator · Pay Stub Reconciliation', margin, doc.internal.pageSize.height - 7);
    doc.text(`Page ${i} of ${pageCount}`, pageW - margin, doc.internal.pageSize.height - 7, { align: 'right' });
  }

  const safeName = (technicianName || 'technician').replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
  const safeStart = periodStart.replace(/-/g, '');
  const safeEnd = periodEnd.replace(/-/g, '');
  doc.save(`reconciliation-${safeName}-${safeStart}-${safeEnd}.pdf`);
}
