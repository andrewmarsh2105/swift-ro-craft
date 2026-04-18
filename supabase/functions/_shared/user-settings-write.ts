export async function writeUserSettingsByUserId(
  supabaseAdmin: any,
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
