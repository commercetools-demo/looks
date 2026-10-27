/**
 * Cent amount of an amount typed by a person: digits with an optional decimal
 * part of one or two digits, separated by a comma or a dot ("189,90",
 * "189.9", "190"). `undefined` for anything else, including empty and
 * grouped thousands, which would be ambiguous.
 */
export function parseCents(text: string): number | undefined {
  const match = /^(\d+)(?:[.,](\d{1,2}))?$/.exec(text.trim());
  if (!match) return undefined;
  return Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0') || 0);
}
