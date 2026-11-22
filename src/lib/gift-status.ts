// Zentrale Liste der gueltigen Gift-Status-Werte.
export const GIFT_STATUSES = ["idea", "purchased", "given"] as const;
export type GiftStatus = (typeof GIFT_STATUSES)[number];

// "given" (ueberreicht/dokumentiertes Geschenk, A2/A9, #21/#26) ist private
// Geschenke-Historie - taucht bewusst weder in der aktiven Ideen-Liste
// (Personenseite) noch in der geteilten Ansicht auf (dort wuerde es sonst
// verraten, was schon verschenkt wurde, ohne dass das Absicht ist - QA6/
// Datensparsamkeit). Beide Stellen filtern deshalb auf diese Teilmenge
// statt auf GIFT_STATUSES.
export const ACTIVE_GIFT_STATUSES = ["idea", "purchased"] as const;
