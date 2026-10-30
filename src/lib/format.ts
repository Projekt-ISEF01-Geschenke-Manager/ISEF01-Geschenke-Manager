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

const MONTH_NAMES_SHORT = [
  "Jan",
  "Feb",
  "Mär",
  "Apr",
  "Mai",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Okt",
  "Nov",
  "Dez",
];

// Kurzer Monatsname fuer das Datumsabzeichen bei "Naechste Anlaesse"
// (Uebersicht-Wireframe, z. B. "14. / Nov").
export function monthAbbreviation(month: number): string {
  return MONTH_NAMES_SHORT[month - 1];
}

export function formatBirthday(
  day: number | null,
  month: number | null,
  year: number | null,
): string | null {
  if (day === null || month === null) return null;
  const base = `${day}. ${MONTH_NAMES[month - 1]}`;
  return year ? `${base} ${year}` : base;
}

// "A", "A und B" oder "A, B und C" - fuer die Teilen-Ansicht ("Geschenkideen
// für X und Y", A10).
export function joinWithUnd(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} und ${names[names.length - 1]}`;
}

// Bis zu zwei Initialen aus einem Namen, z. B. "Oma Erna" -> "OE".
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}
