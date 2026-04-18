type SupabaseAdminClient = {
  from: (table: string) => {
    update: (patch: Record<string, unknown>) => {
      eq: (column: string, value: string) => {
        select: (columns: string) => {
          limit: (count: number) => Promise<{ data: { user_id: string }[] | null; error: { code?: string; message: string } | null }>;
        };
        then?: never;
      };
    };
    insert: (row: Record<string, unknown>) => Promise<{ error: { code?: string; message: string } | null }>;
  };
};

export async function writeUserSettingsByUserId(
  supabaseAdmin: SupabaseAdminClient,
  userId: string,
  patch: Record<string, unknown>,
) {
  const { user_id: _ignoredUserId, ...safePatch } = patch as { user_id?: unknown } & Record<string, unknown>;

  const { data: updatedRows, error: updateError } = await supabaseAdmin
    .from("user_settings")
    .update(safePatch)
    .eq("user_id", userId)
    .select("user_id")
    .limit(1);

  if (updateError) {
    return { error: updateError };
  }

  if ((updatedRows?.length ?? 0) > 0) {
    return { error: null };
  }

  const { error: insertError } = await supabaseAdmin
    .from("user_settings")
    .insert({ user_id: userId, ...safePatch });

  if (insertError && (insertError as { code?: string }).code === "23505") {
    const { error: retryError } = await supabaseAdmin
      .from("user_settings")
      .update(safePatch)
      .eq("user_id", userId);

    return { error: retryError ?? null };
  }

  return { error: insertError ?? null };
}
