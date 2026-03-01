export function parseInteger(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

export function pickFields(source: Record<string, unknown>, allowedFields: string[]): Record<string, unknown> {
  const picked: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (key in source) {
      picked[key] = source[key];
    }
  }
  return picked;
}