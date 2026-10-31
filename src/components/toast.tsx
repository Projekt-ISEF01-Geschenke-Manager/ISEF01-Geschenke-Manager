"use client";

import { useEffect, useRef } from "react";
import { CheckCircle2 } from "lucide-react";

const AUTO_DISMISS_MS = 3000;

// Schlichte Erfolgsmeldung unten mittig, verschwindet von selbst - genutzt
// als Bestätigung, wenn ein Popup nach erfolgreichem Speichern automatisch
// schließt (sonst gäbe es gar kein sichtbares Feedback mehr, siehe
// DashboardOverview).
export function Toast({
  message,
  onDismiss,
}: {
  message: string | null;
  onDismiss: () => void;
}) {
  // Ref statt onDismiss direkt in den Dependencies: Aufrufer wie
  // DashboardOverview uebergeben bei jedem Render eine neue
  // Funktionsreferenz (z. B. "() => setToastMessage(null)") - mit
  // onDismiss direkt in den Deps wuerde JEDER Re-Render des Elternteils
  // den Timer neu starten, solange der Toast sichtbar ist, und ihn so
  // effektiv auf unbestimmte Zeit offen halten statt nach 3s zu
  // schliessen. Die Ref bleibt ueber Renders hinweg dieselbe, der Effekt
  // ist damit nur an echte message-Wechsel gekoppelt.
  const onDismissRef = useRef(onDismiss);
  useEffect(() => {
    onDismissRef.current = onDismiss;
  });

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onDismissRef.current();
    }, AUTO_DISMISS_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [message]);

  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-btn-bg px-5 py-3 text-sm font-medium text-btn-text shadow-lg"
    >
      <CheckCircle2 className="h-5 w-5 shrink-0" />
      {message}
    </div>
  );
}
