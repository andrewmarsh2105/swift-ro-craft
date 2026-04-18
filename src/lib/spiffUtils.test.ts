import { describe, expect, it } from 'vitest';
import {
  buildSpiffReport,
  findLikelySpiffRuleOverlaps,
  lineMatchesSpiffRule,
  normalizeSpiffManualEntries,
  normalizeSpiffMatchText,
  normalizeSpiffRules,
  parseSpiffRuleAliases,
  sanitizeSpiffManualEntriesForStorage,
  sanitizeSpiffRulesForStorage,
} from '@/lib/spiffUtils';
import type { RepairOrder } from '@/types/ro';

const ro: RepairOrder = {
  id: 'ro-1',
  roNumber: '101',
  date: '2026-04-14',
  paidDate: '2026-04-14',
  advisor: 'A',
  paidHours: 2,
  laborType: 'customer-pay',
  workPerformed: 'x',
  notes: '',
  photos: [],
  lines: [
    { id: 'line-1', lineNo: 1, description: 'Cabin Filter replacement', hoursPaid: 1, laborType: 'customer-pay', createdAt: '', updatedAt: '' },
    { id: 'line-2', lineNo: 2, description: 'Brake flush', hoursPaid: 1, laborType: 'customer-pay', createdAt: '', updatedAt: '' },
  ],
  isSimpleMode: false,
  createdAt: '',
  updatedAt: '',
};

describe('spiffUtils', () => {
  it('builds automatic + manual totals', () => {
    const rules = normalizeSpiffRules([
      { id: 'r1', name: 'Cabin', matchText: 'cabin filter', unitPay: 10, scheduleType: 'forever' },
      { id: 'r2', name: 'Brake', matchText: 'brake', unitPay: 15, scheduleType: 'weekly', activeFrom: '2026-04-13', activeTo: '2026-04-19' },
    ]);
    const manual = normalizeSpiffManualEntries([
      { id: 'm1', date: '2026-04-14', label: 'Walk-in', quantity: 2, unitPay: 7 },
      { id: 'm2', date: '2026-04-14', label: 'Extra cabin', quantity: 1, ruleId: 'r1', unitPay: 10 },
    ]);

    const report = buildSpiffReport({ ros: [ro], startDate: '2026-04-10', endDate: '2026-04-17', rules, manualEntries: manual });

    expect(report.totalAutoCount).toBe(2);
    expect(report.totalManualCount).toBe(3);
    expect(report.totalCount).toBe(5);
    expect(report.totalPay).toBe(49);
    expect(report.byRule.find((r) => r.ruleId === 'r1')?.totalCount).toBe(2);
  });

  it('preserves basic single-text substring matching behavior', () => {
    const [rule] = normalizeSpiffRules([
      { id: 'legacy', name: 'Legacy', matchText: 'cabin filter', unitPay: 1, scheduleType: 'forever' },
    ]);

    expect(lineMatchesSpiffRule(rule, 'Installed CABIN FILTER on vehicle')).toBe(true);
    expect(lineMatchesSpiffRule(rule, 'Performed brake flush')).toBe(false);
  });

  it('normalizes punctuation and spacing for matching', () => {
    const [rule] = normalizeSpiffRules([
      { id: 'normalize', name: 'Normalize', matchText: 'cabin filter', unitPay: 1, scheduleType: 'forever' },
    ]);

    expect(normalizeSpiffMatchText('   Cabin---Filter   service  ')).toBe('cabin filter service');
    expect(lineMatchesSpiffRule(rule, 'CABIN---FILTER service complete')).toBe(true);
  });

  it('supports comma-separated aliases in rule matching', () => {
    const [rule] = normalizeSpiffRules([
      { id: 'aliases', name: 'Alias Rule', matchText: 'cabin filter, cabin air filter, pollen filter', unitPay: 1, scheduleType: 'forever' },
    ]);

    expect(parseSpiffRuleAliases(rule.matchText)).toEqual(['cabin filter', 'cabin air filter', 'pollen filter']);
    expect(lineMatchesSpiffRule(rule, 'Replaced pollen filter')).toBe(true);
    expect(lineMatchesSpiffRule(rule, 'Adjusted tire pressure')).toBe(false);
  });

  it('keeps report totals stable while using normalized/alias matches', () => {
    const rules = normalizeSpiffRules([
      { id: 'r1', name: 'Cabin', matchText: 'cabin filter, pollen filter', unitPay: 10, scheduleType: 'forever' },
      { id: 'r2', name: 'Brake', matchText: 'brake', unitPay: 15, scheduleType: 'forever' },
    ]);
    const manual = normalizeSpiffManualEntries([
      { id: 'm1', date: '2026-04-14', label: 'Manual', quantity: 1, unitPay: 5 },
    ]);

    const report = buildSpiffReport({ ros: [ro], startDate: '2026-04-10', endDate: '2026-04-17', rules, manualEntries: manual });
    expect(report.totalAutoCount).toBe(2);
    expect(report.totalManualCount).toBe(1);
    expect(report.totalPay).toBe(30);
  });

  it('detects likely overlap between similar rules', () => {
    const rules = normalizeSpiffRules([
      { id: 'r1', name: 'Cabin filter', matchText: 'cabin filter', unitPay: 1, scheduleType: 'forever' },
      { id: 'r2', name: 'Cabin air', matchText: 'cabin air filter', unitPay: 1, scheduleType: 'forever' },
      { id: 'r3', name: 'Brake', matchText: 'brake flush', unitPay: 1, scheduleType: 'forever' },
    ]);

    const overlapMap = findLikelySpiffRuleOverlaps(rules);
    expect(overlapMap.get('r1')?.has('r2')).toBe(true);
    expect(overlapMap.get('r2')?.has('r1')).toBe(true);
    expect(overlapMap.get('r3')).toBeUndefined();
  });

  it('sanitizes rules for storage-safe payloads', () => {
    const rules = sanitizeSpiffRulesForStorage([
      {
        id: 'r1',
        name: '   Cabin   ',
        matchText: ' filter ',
        unitPay: Number.POSITIVE_INFINITY,
        scheduleType: 'weekly',
        activeFrom: '2026-04-20',
        activeTo: '2026-04-01',
      },
    ]);

    expect(rules).toHaveLength(1);
    expect(rules[0].unitPay).toBe(0);
    expect(rules[0].activeFrom).toBe('2026-04-01');
    expect(rules[0].activeTo).toBe('2026-04-20');
  });

  it('sanitizes manual entries for storage-safe payloads', () => {
    const manualEntries = sanitizeSpiffManualEntriesForStorage([
      {
        id: 'm1',
        date: '2026-04-14',
        label: '  Walk-in  ',
        quantity: Number.NaN,
        unitPay: Number.POSITIVE_INFINITY,
      },
      {
        id: 'm2',
        date: '04/14/2026',
        label: 'Bad date',
        quantity: 1,
      },
    ]);

    expect(manualEntries).toHaveLength(1);
    expect(manualEntries[0].label).toBe('Walk-in');
    expect(manualEntries[0].quantity).toBe(1);
    expect(manualEntries[0].unitPay).toBe(0);
  });
});
