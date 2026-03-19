import { describe, expect, it } from 'vitest';
import {
  createScanSession,
  detectHeaderConflicts,
  mergePageIntoSession,
  type ExtractedData,
} from '@/lib/scanStateMachine';

function makeExtractedData(overrides: Partial<ExtractedData> = {}): ExtractedData {
  return {
    roNumber: '12345',
    advisor: 'Alex',
    date: '2026-03-10',
    customerName: 'Pat Doe',
    mileage: '120000',
    vehicleYear: 2024,
    vehicleMake: 'Toyota',
    vehicleModel: 'Camry',
    vehicleVin: 'VIN123',
    candidateDates: [],
    lines: [],
    fieldConfidence: {
      roNumber: 0.95,
      advisor: 0.9,
      date: 0.85,
    },
    ...overrides,
  };
}

describe('scanStateMachine helpers', () => {
  it('detects header conflicts with normalized values and ignores equivalent formatting', () => {
    const existing = makeExtractedData({ roNumber: 'RO 123', mileage: '120000' });
    const incoming = makeExtractedData({ roNumber: 'ro   123', mileage: '120,000' });

    const conflicts = detectHeaderConflicts(existing, incoming, 2);
    expect(conflicts).toEqual([]);

    const incomingConflict = makeExtractedData({ roNumber: 'RO-124', mileage: '120,100' });
    const changed = detectHeaderConflicts(existing, incomingConflict, 2);
    expect(changed).toEqual([
      { field: 'roNumber', existingValue: 'RO 123', newValue: 'RO-124', pageNumber: 2 },
      { field: 'mileage', existingValue: '120000', newValue: '120,100', pageNumber: 2 },
    ]);
  });

  it('merges multi-page scans with newest lines first and sourcePage tagging', () => {
    const page1 = makeExtractedData({
      lines: [
        { id: 'l1', description: 'Brake job', hours: 1.2, laborType: 'customer-pay', confidence: 0.9 },
      ],
    });

    const page2 = makeExtractedData({
      advisor: 'Jordan',
      lines: [
        { id: 'l2', description: 'Diag', hours: 0.8, laborType: 'warranty', confidence: 0.88 },
      ],
    });

    const firstMerge = mergePageIntoSession(createScanSession(), page1, 'blob://first', 'storage/p1', 'tpl-1');
    expect(firstMerge.state).toBe('review');
    expect(firstMerge.pages).toHaveLength(1);
    expect(firstMerge.extractedData?.lines[0].sourcePage).toBe(1);

    const secondMerge = mergePageIntoSession(firstMerge, page2, 'blob://second', 'storage/p2', 'tpl-2');

    expect(secondMerge.pages).toHaveLength(2);
    expect(secondMerge.extractedData?.advisor).toBe('Alex'); // first page header kept
    expect(secondMerge.imagePreviewUrl).toBe('blob://first');
    expect(secondMerge.storagePath).toBe('storage/p1');
    expect(secondMerge.extractedData?.lines.map(l => l.id)).toEqual(['l2', 'l1']);
    expect(secondMerge.extractedData?.lines.map(l => l.sourcePage)).toEqual([2, 1]);
  });

  it('applies header overrides while merging pending pages', () => {
    const session = mergePageIntoSession(
      createScanSession(),
      makeExtractedData({ roNumber: '5001', date: '2026-03-09', mileage: '90000' }),
      'blob://first',
      'storage/p1',
      null,
    );

    const merged = mergePageIntoSession(
      session,
      makeExtractedData({ roNumber: '5002', date: '2026-03-10', mileage: '91000' }),
      'blob://second',
      'storage/p2',
      null,
      { roNumber: 'OVERRIDE-RO', date: '2026-03-11', mileage: '91500' },
    );

    expect(merged.extractedData?.roNumber).toBe('OVERRIDE-RO');
    expect(merged.extractedData?.date).toBe('2026-03-11');
    expect(merged.extractedData?.mileage).toBe('91500');
  });
});
