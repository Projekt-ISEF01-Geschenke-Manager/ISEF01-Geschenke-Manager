// Weihnachten hat in der Datenbank keinen Datums-Wert (occasions speichert
// nur den Namen) - 24.12. ist hier bewusst als feste Konvention hinterlegt.
// Wird auch vom taeglichen convert-past-gifts-Job genutzt (#21/#26), um zu
// erkennen, wann Weihnachten vorbei ist.
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

// Fand ein Tag/Monat-Datum (Geburtstag, Weihnachten) innerhalb der letzten
// "windowDays" Tage vor "today" statt? Gibt das exakte Datum zurueck (statt
// nur ja/nein), damit der aufrufende Code es direkt als gift_date
// uebernehmen kann. Ein Fenster statt nur "genau gestern", damit ein
// ausgefallener Cron-Lauf (#21/#26, convert-past-gifts) nicht dazu fuehrt,
// dass ein Anlass uebersehen wird - der Status-Filter (nur "purchased")
// macht einen erneuten Treffer an einem Folgetag ungefaehrlich (idempotent).
export function findRecentOccurrence(
  day: number,
  month: number,
  today: Date,
  windowDays = 3,
): Date | null {
  for (let i = 1; i <= windowDays; i++) {
    const past = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    if (past.getDate() === day && past.getMonth() + 1 === month) {
      return past;
    }
  }
  return null;
}
