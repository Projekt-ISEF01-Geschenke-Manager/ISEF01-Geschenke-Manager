// Geteilt zwischen updateGift() (Validierung + Upload) und deleteGift()
// (Aufraeumen) - Bucket-Policies siehe docs/database-schema.md Abschnitt 3.
export const GIFT_IMAGE_BUCKET = "gift-images";

// Zweite Huerde (defense in depth, wie isValidHttpUrl()) - der Bucket selbst
// hat dieselben Grenzen als file_size_limit/allowed_mime_types hinterlegt.
export const MAX_GIFT_IMAGE_BYTES = 4 * 1024 * 1024;

export const ALLOWED_GIFT_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

// Fester Pfad pro Idee, ohne Dateiendung (Content-Type kommt beim Upload
// explizit mit) - ein erneuter Upload ueberschreibt (upsert) denselben Pfad,
// es gibt also nie mehr als eine gespeicherte Datei pro Idee.
export function giftImagePath(userId: string, giftId: string): string {
  return `${userId}/${giftId}`;
}
