export function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

export function matchesSearchQuery(
  haystack: string,
  query: string,
): boolean {
  const q = normalizeSearchText(query);
  if (!q) return true;
  return normalizeSearchText(haystack).includes(q);
}

export function matchesAnySearchField(
  fields: Array<string | number | null | undefined>,
  query: string,
): boolean {
  return matchesSearchQuery(
    fields.filter((v) => v != null && v !== "").map(String).join(" "),
    query,
  );
}
