/**
 * src/lib/parseLines.ts
 *
 * Smart paste parser for RO lines.
 */
import type { LaborType } from "@/types/ro";

export type ParsedLine = {
  description: string;
  hoursPaid: number;
  isTbd: boolean;
  laborType: LaborType;
};

const HOURS_RE = /(\d+(?:\.\d+)?)\s*(h|hr|hrs|hour|hours)?\s*$/i;

function normalizePrefix(s: string) {
  return s.trim().toLowerCase();
}

function detectLaborType(line: string, fallback: LaborType): { laborType: LaborType; text: string } {
  const raw = line.trim();

  // [W] / [CP] / [I]
  const bracket = raw.match(/^\[(w|cp|i)\]\s*/i);
  if (bracket) {
    const tag = bracket[1].toLowerCase();
    const rest = raw.replace(/^\[(w|cp|i)\]\s*/i, "");
    if (tag === "w") return { laborType: "warranty", text: rest };
    if (tag === "i") return { laborType: "internal", text: rest };
    return { laborType: "customer-pay", text: rest };
  }

  // W: / CP: / I:
  const prefix = raw.match(/^(warranty|w|cp|customer\s*pay|customer-pay|internal|i)\s*[:-]\s*/i);
  if (prefix) {
    const p = normalizePrefix(prefix[1]);
    const rest = raw.replace(/^(warranty|w|cp|customer\s*pay|customer-pay|internal|i)\s*[:-]\s*/i, "");
    if (p === "w" || p === "warranty") return { laborType: "warranty", text: rest };
    if (p === "i" || p === "internal") return { laborType: "internal", text: rest };
    return { laborType: "customer-pay", text: rest };
  }

  return { laborType: fallback, text: raw };
}

function stripLineNumber(raw: string) {
  // L1: , 1) , 1. , Line 1:
  return raw
    .replace(/^\s*(?:l\s*)?\d+\s*[:.)-]\s*/i, "")
    .replace(/^\s*line\s*\d+\s*[:.)-]\s*/i, "")
    .trim();
}

export function parsePastedLines(text: string, fallbackLaborType: LaborType): ParsedLine[] {
  const lines = text
    .split("\n")
    .map((s) => s.replace(/\r/g, "").trim())
    .filter(Boolean);

  const out: ParsedLine[] = [];

  for (const original of lines) {
    let s = stripLineNumber(original);

    const { laborType, text: afterType } = detectLaborType(s, fallbackLaborType);
    s = afterType.trim();

    // TBD markers
    const hasTbdWord = /\btbd\b/i.test(s);

    // hours at end
    let hoursPaid = 0;
    let isTbd = hasTbdWord;

    const hm = s.match(HOURS_RE);
    if (hm) {
      const n = Number(hm[1]);
      if (Number.isFinite(n)) {
        hoursPaid = n;
        isTbd = false;
        s = s.replace(HOURS_RE, "").trim();
      }
    }

    // if still no hours, treat as TBD
    if (!hoursPaid && !hasTbdWord) {
      isTbd = true;
    }

    // remove trailing tbd token
    s = s.replace(/\b(tbd)\b/gi, "").trim();

    if (!s) continue;

    out.push({ description: s, hoursPaid, isTbd, laborType });
  }

  return out;
}
