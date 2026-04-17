import type { ROLine } from '@/types/ro';

export type SplitStatusChoice = 'open' | 'paid';

const VERSION_SUFFIX_REGEX = /\s*(?:\(|-|#)?\s*v(?:ersion)?\s*(\d+)\)?\s*$/i;

function getBaseRONumber(roNumber: string): string {
  return roNumber.replace(VERSION_SUFFIX_REGEX, '').trim();
}

export function buildSplitRONumber(roNumber: string, existingRONumbers: string[]): string {
  const base = getBaseRONumber(roNumber);
  const escapedBase = base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const suffixRegex = new RegExp(`^${escapedBase}\\s*v(\\d+)$`, 'i');

  const maxVersion = existingRONumbers.reduce((max, value) => {
    const trimmed = value.trim();
    if (trimmed.toLowerCase() === base.toLowerCase()) return Math.max(max, 1);
    const match = trimmed.match(suffixRegex);
    if (!match) return max;
    const parsed = Number(match[1]);
    if (!Number.isFinite(parsed)) return max;
    return Math.max(max, parsed);
  }, 1);

  return `${base} v${maxVersion + 1}`;
}

export function splitLinesBySelection(lines: ROLine[], selectedLineIds: string[]) {
  const selectedSet = new Set(selectedLineIds);
  const version2Lines = lines.filter((line) => selectedSet.has(line.id));
  const remainingLines = lines.filter((line) => !selectedSet.has(line.id));
  return { version2Lines, remainingLines };
}
