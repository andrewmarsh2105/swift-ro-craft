import type { RepairOrder } from '@/types/ro';
import type { SpiffManualEntry, SpiffReport, SpiffRule } from '@/types/spiff';

function sameOrAfter(a: string, b: string) {
  return a >= b;
}

function sameOrBefore(a: string, b: string) {
  return a <= b;
}

export function isRuleActiveOnDate(rule: SpiffRule, date: string) {
  if (rule.scheduleType === 'forever') return true;
  const from = rule.activeFrom;
  const to = rule.activeTo;
  if (from && !sameOrAfter(date, from)) return false;
  if (to && !sameOrBefore(date, to)) return false;
  return true;
}

export function lineMatchesSpiffRule(rule: SpiffRule, lineDescription: string) {
  const needle = rule.matchText.trim().toLowerCase();
  if (!needle) return false;
  return lineDescription.toLowerCase().includes(needle);
}

export function buildSpiffReport({
  ros,
  startDate,
  endDate,
  rules,
  manualEntries,
}: {
  ros: RepairOrder[];
  startDate: string;
  endDate: string;
  rules: SpiffRule[];
  manualEntries: SpiffManualEntry[];
}): SpiffReport {
  const byRule = rules.map((rule) => ({
    ruleId: rule.id,
    ruleName: rule.name,
    unitPay: Number(rule.unitPay) || 0,
    autoCount: 0,
    manualCount: 0,
    totalCount: 0,
    totalPay: 0,
  }));

  const ruleIndex = new Map(byRule.map((item) => [item.ruleId, item]));
  const rulesById = new Map(rules.map((rule) => [rule.id, rule]));

  ros.forEach((ro) => {
    const effectiveDate = ro.paidDate || ro.date;
    if (effectiveDate < startDate || effectiveDate > endDate) return;

    (ro.lines || []).forEach((line) => {
      rules.forEach((rule) => {
        if (!isRuleActiveOnDate(rule, effectiveDate)) return;
        if (!lineMatchesSpiffRule(rule, line.description || '')) return;
        const summary = ruleIndex.get(rule.id);
        if (!summary) return;
        summary.autoCount += 1;
        summary.totalCount += 1;
        summary.totalPay += summary.unitPay;
      });
    });
  });

  const uncategorizedManual: SpiffManualEntry[] = [];
  let manualOnlyPay = 0;

  manualEntries.forEach((entry) => {
    if (entry.date < startDate || entry.date > endDate) return;

    const qty = Number(entry.quantity) > 0 ? Number(entry.quantity) : 1;

    if (entry.ruleId) {
      const summary = ruleIndex.get(entry.ruleId);
      if (!summary) {
        uncategorizedManual.push(entry);
        const fallbackPay = (Number(entry.unitPay) || 0) * qty;
        manualOnlyPay += fallbackPay;
        return;
      }

      const configuredRule = rulesById.get(entry.ruleId);
      const unitPay = Number(entry.unitPay ?? configuredRule?.unitPay ?? summary.unitPay) || 0;
      summary.manualCount += qty;
      summary.totalCount += qty;
      summary.totalPay += unitPay * qty;
      return;
    }

    uncategorizedManual.push(entry);
    manualOnlyPay += (Number(entry.unitPay) || 0) * qty;
  });

  byRule.sort((a, b) => b.totalPay - a.totalPay || b.totalCount - a.totalCount || a.ruleName.localeCompare(b.ruleName));

  const totals = byRule.reduce((acc, item) => {
    acc.totalAutoCount += item.autoCount;
    acc.totalManualCount += item.manualCount;
    acc.totalCount += item.totalCount;
    acc.totalPay += item.totalPay;
    return acc;
  }, {
    totalAutoCount: 0,
    totalManualCount: 0,
    totalCount: 0,
    totalPay: 0,
  });

  const uncategorizedTotalCount = uncategorizedManual.reduce((sum, entry) => sum + (Number(entry.quantity) > 0 ? Number(entry.quantity) : 1), 0);

  return {
    totalAutoCount: totals.totalAutoCount,
    totalManualCount: totals.totalManualCount + uncategorizedTotalCount,
    totalCount: totals.totalCount + uncategorizedTotalCount,
    totalPay: totals.totalPay + manualOnlyPay,
    manualOnlyPay,
    byRule,
    uncategorizedManual,
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function normalizeSpiffRules(raw: unknown): SpiffRule[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .filter(isObject)
    .map((row) => {
      const id = typeof row.id === 'string' ? row.id : crypto.randomUUID();
      const name = typeof row.name === 'string' ? row.name.trim() : '';
      const matchText = typeof row.matchText === 'string' ? row.matchText.trim() : '';
      if (!name || !matchText) return null;

      const scheduleType = row.scheduleType === 'weekly' ? 'weekly' : 'forever';
      const activeFrom = typeof row.activeFrom === 'string' ? row.activeFrom : undefined;
      const activeTo = typeof row.activeTo === 'string' ? row.activeTo : undefined;
      const createdAt = typeof row.createdAt === 'string' ? row.createdAt : new Date().toISOString();
      const updatedAt = typeof row.updatedAt === 'string' ? row.updatedAt : createdAt;

      return {
        id,
        name,
        matchText,
        unitPay: Number(row.unitPay) || 0,
        scheduleType,
        activeFrom,
        activeTo,
        createdAt,
        updatedAt,
      } as SpiffRule;
    })
    .filter((row): row is SpiffRule => !!row);
}

export function normalizeSpiffManualEntries(raw: unknown): SpiffManualEntry[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .filter(isObject)
    .map((row) => {
      const id = typeof row.id === 'string' ? row.id : crypto.randomUUID();
      const date = typeof row.date === 'string' ? row.date : '';
      const label = typeof row.label === 'string' ? row.label.trim() : '';
      if (!date || !label) return null;

      const createdAt = typeof row.createdAt === 'string' ? row.createdAt : new Date().toISOString();
      const updatedAt = typeof row.updatedAt === 'string' ? row.updatedAt : createdAt;

      return {
        id,
        date,
        label,
        ruleId: typeof row.ruleId === 'string' ? row.ruleId : undefined,
        quantity: Math.max(1, Number(row.quantity) || 1),
        unitPay: typeof row.unitPay === 'number' ? row.unitPay : Number(row.unitPay) || 0,
        createdAt,
        updatedAt,
      } as SpiffManualEntry;
    })
    .filter((row): row is SpiffManualEntry => !!row);
}
