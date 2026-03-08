export function normalizeAdvisorName(name: string): string {
  if (!name) return "";

  let cleaned = name.trim().replace(/\s+/g, " ");

  // Convert LAST, FIRST → First Last
  if (cleaned.includes(",")) {
    const parts = cleaned.split(",");
    if (parts.length === 2) {
      const last = parts[0].trim();
      const first = parts[1].trim();
      cleaned = `${first} ${last}`;
    }
  }

  // Convert all caps → Title Case
  cleaned = cleaned
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase());

  return cleaned;
}
