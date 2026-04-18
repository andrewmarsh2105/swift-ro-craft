import type { RepairOrder } from '@/types/ro';
import type { SpiffManualEntry, SpiffReport, SpiffRule } from '@/types/spiff';
const SPIFF_PUNCTUATION_NOISE = /[.,/#!$%^&*;:{}=\-_`~()"'?[\]\\|@+<>]/g;

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
  const aliases = parseSpiffRuleAliases(rule.matchText);
  if (aliases.length === 0) return false;
  const haystack = normalizeSpiffMatchText(lineDescription);
  if (!haystack) return false;
  return aliases.some((needle) => haystack.includes(needle));
}

export function normalizeSpiffMatchText(value: string) {
  if (!value) return '';
  return value
    .toLowerCase()
    .replace(SPIFF_PUNCTUATION_NOISE, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseSpiffRuleAliases(matchText: string) {
  if (!matchText) return [];
  return matchText
    .split(',')
    .map((alias) => normalizeSpiffMatchText(alias))
    .filter(Boolean);
}

export function buildSpiffRulePreview({
  rule,
  ros,
  startDate,
  endDate,
}: {
  rule: Pick<SpiffRule, 'matchText' | 'scheduleType' | 'activeFrom' | 'activeTo'>;
  ros: RepairOrder[];
  startDate: string;
  endDate: string;
}) {
  const descriptions = new Set<string>();
  const roIds = new Set<string>();
  let lineCount = 0;

  ros.forEach((ro) => {
    const effectiveDate = ro.paidDate || ro.date;
    if (effectiveDate < startDate || effectiveDate > endDate) return;
    if (!isRuleActiveOnDate(rule as SpiffRule, effectiveDate)) return;

    (ro.lines || []).forEach((line) => {
      const description = line.description || '';
      if (!lineMatchesSpiffRule(rule as SpiffRule, description)) return;
      lineCount += 1;
      roIds.add(ro.id);
      if (descriptions.size < 3) descriptions.add(description);
    });
  });

  return {
    lineCount,
    roCount: roIds.size,
    sampleDescriptions: Array.from(descriptions),
  };
}

export function findLikelySpiffRuleOverlaps(rules: SpiffRule[]) {
  const overlaps = new Map<string, Set<string>>();
  const normalized = rules.map((rule) => ({
    id: rule.id,
    aliases: new Set(parseSpiffRuleAliases(rule.matchText)),
  }));

  for (let i = 0; i < normalized.length; i += 1) {
    for (let j = i + 1; j < normalized.length; j += 1) {
      const left = normalized[i];
      const right = normalized[j];

      const hasDirectAliasOverlap = [...left.aliases].some((alias) => right.aliases.has(alias));
      const hasContainmentOverlap = [...left.aliases].some((alias) =>
        alias.length >= 3 && [...right.aliases].some((other) => other.includes(alias) || alias.includes(other)),
      );
      const hasKeywordOverlap = [...left.aliases].some((alias) => {
        const leftTokens = alias.split(' ').filter((token) => token.length >= 3);
        return [...right.aliases].some((other) => {
          const rightTokens = new Set(other.split(' ').filter((token) => token.length >= 3));
          return leftTokens.filter((token) => rightTokens.has(token)).length >= 2;
        });
      });

      if (!hasDirectAliasOverlap && !hasContainmentOverlap && !hasKeywordOverlap) continue;

      if (!overlaps.has(left.id)) overlaps.set(left.id, new Set());
      if (!overlaps.has(right.id)) overlaps.set(right.id, new Set());
      overlaps.get(left.id)?.add(right.id);
      overlaps.get(right.id)?.add(left.id);
    }
  }

  return overlaps;
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

function toFiniteNumber(value: unknown, fallback = 0) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function isIsoDateString(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
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
      let activeFrom = isIsoDateString(row.activeFrom) ? row.activeFrom : undefined;
      let activeTo = isIsoDateString(row.activeTo) ? row.activeTo : undefined;
      if (scheduleType === 'weekly' && activeFrom && activeTo && activeFrom > activeTo) {
        [activeFrom, activeTo] = [activeTo, activeFrom];
      }
      const createdAt = typeof row.createdAt === 'string' ? row.createdAt : new Date().toISOString();
      const updatedAt = typeof row.updatedAt === 'string' ? row.updatedAt : createdAt;

      return {
        id,
        name,
        matchText,
        unitPay: toFiniteNumber(row.unitPay, 0),
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
      const date = isIsoDateString(row.date) ? row.date : '';
      const label = typeof row.label === 'string' ? row.label.trim() : '';
      if (!date || !label) return null;

      const createdAt = typeof row.createdAt === 'string' ? row.createdAt : new Date().toISOString();
      const updatedAt = typeof row.updatedAt === 'string' ? row.updatedAt : createdAt;

      return {
        id,
        date,
        label,
        ruleId: typeof row.ruleId === 'string' ? row.ruleId : undefined,
        quantity: Math.max(1, Math.round(toFiniteNumber(row.quantity, 1))),
        unitPay: toFiniteNumber(row.unitPay, 0),
        createdAt,
        updatedAt,
      } as SpiffManualEntry;
    })
    .filter((row): row is SpiffManualEntry => !!row);
}

export function sanitizeSpiffRulesForStorage(rules: unknown): SpiffRule[] {
  return normalizeSpiffRules(rules);
}

export function sanitizeSpiffManualEntriesForStorage(entries: unknown): SpiffManualEntry[] {
  return normalizeSpiffManualEntries(entries);
}
