// Zentrale Liste der aktuell gueltigen Gift-Status-Werte (A4: offen/besorgt).
// "given" (ueberreicht, Stufe 2/A9) kommt separat dazu - wenn der Status
// ergaenzt wird, muss hier UND in der oeffentlichen Teilen-Route (A10)
// bewusst entschieden werden, ob er mit auftaucht (Codacy-Review-Hinweis).
export const GIFT_STATUSES = ["idea", "purchased"] as const;
export type GiftStatus = (typeof GIFT_STATUSES)[number];
