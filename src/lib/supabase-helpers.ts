/** Supabase joins can return an object or array depending on relationship inference. */
export function getJoinedField<T extends Record<string, unknown>>(
  joined: T | T[] | null | undefined,
  field: keyof T
): string | undefined {
  if (!joined) return undefined;
  const item = Array.isArray(joined) ? joined[0] : joined;
  const value = item?.[field];
  return value != null ? String(value) : undefined;
}
