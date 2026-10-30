// Weihnachten hat in der Datenbank keinen Datums-Wert (occasions speichert
// nur den Namen) - 24.12. ist hier bewusst als feste Konvention
// hinterlegt, so wie auch beim Uebernehmen einer Idee als Geschenk
// (Personenseite-Wireframe: "Weihnachten -> 24.12.").
export const CHRISTMAS_MONTH = 12;
export const CHRISTMAS_DAY = 24;

// Naechstes Vorkommen eines Tag/Monat-Datums (Geburtstag, Weihnachten) ab
// "from", in ganzen Tagen. Liegt der Tag dieses Jahr schon in der
// Vergangenheit, wird das naechste Jahr genommen.
export function daysUntilNextOccurrence(
  day: number,
  month: number,
  from: Date,
): number {
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  let next = new Date(today.getFullYear(), month - 1, day);

  if (next < today) {
    next = new Date(today.getFullYear() + 1, month - 1, day);
  }

  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((next.getTime() - today.getTime()) / msPerDay);
}

export function formatDaysUntil(days: number): string {
  if (days === 0) return "heute";
  if (days === 1) return "morgen";
  return `in ${days} Tagen`;
}
