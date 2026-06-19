export function parseLocalDate(value: FormDataEntryValue | null): Date {
  const text = String(value ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw new Error("Choose a valid date.");
  return new Date(`${text}T12:00:00.000Z`);
}

export function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-AE", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(date);
}

export function dateInputValue(date = new Date()) {
  return date.toISOString().slice(0, 10);
}
