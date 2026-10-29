const MONTH_NAMES = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
];

export function formatBirthday(
  day: number | null,
  month: number | null,
  year: number | null,
): string | null {
  if (day === null || month === null) return null;
  const base = `${day}. ${MONTH_NAMES[month - 1]}`;
  return year ? `${base} ${year}` : base;
}
