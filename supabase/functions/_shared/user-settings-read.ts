const NON_EMPTY_STRING_REGEX = /\S/;

function valueCompletenessScore(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "string") return NON_EMPTY_STRING_REGEX.test(value) ? 1 : 0;
  if (Array.isArray(value)) return value.length > 0 ? 1 : 0;
  return 1;
}

export function pickBestUserSettingsRow<T extends Record<string, unknown>>(rows: T[], preferredColumns: string[] = []): T {
  if (rows.length === 1) return rows[0];

  const scoreRow = (row: T): number => {
    const columns = preferredColumns.length > 0 ? preferredColumns : Object.keys(row);
    return columns.reduce((score, column) => score + valueCompletenessScore(row[column]), 0);
  };

  const getTime = (row: T, key: "updated_at" | "created_at"): number => {
    const raw = row[key];
    if (typeof raw !== "string") return Number.NEGATIVE_INFINITY;
    const parsed = Date.parse(raw);
    return Number.isNaN(parsed) ? Number.NEGATIVE_INFINITY : parsed;
  };

  return [...rows]
    .sort((a, b) => {
      const scoreDiff = scoreRow(b) - scoreRow(a);
      if (scoreDiff !== 0) return scoreDiff;

      const updatedDiff = getTime(b, "updated_at") - getTime(a, "updated_at");
      if (updatedDiff !== 0) return updatedDiff;

      const createdDiff = getTime(b, "created_at") - getTime(a, "created_at");
      if (createdDiff !== 0) return createdDiff;

      return 0;
    })[0];
}

export async function readUserSettingsByUserId(
  supabaseAdmin: SupabaseAdminClient,
  userId: string,
  selectColumns = "*",
  preferredColumns: string[] = [],
) {
  const { data: rows, error } = await supabaseAdmin
    .from("user_settings")
    .select(selectColumns)
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    return { row: null, rows: [], duplicateCount: 0, error };
  }

  const safeRows = Array.isArray(rows) ? rows : [];
  if (safeRows.length === 0) {
    return { row: null, rows: [], duplicateCount: 0, error: null };
  }

  const bestRow = pickBestUserSettingsRow(safeRows, preferredColumns);
  return {
    row: bestRow,
    rows: safeRows,
    duplicateCount: Math.max(0, safeRows.length - 1),
    error: null,
  };
}
type SupabaseAdminClient = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        order: (column: string, options: { ascending: boolean }) => {
          order: (column: string, options: { ascending: boolean }) => {
            limit: (count: number) => Promise<{ data: Record<string, unknown>[] | null; error: { message: string } | null }>;
          };
        };
      };
    };
  };
};
