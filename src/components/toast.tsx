"use client";

import { useEffect } from "react";
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
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
    // onDismiss bewusst nicht in den Dependencies: Aufrufer wie
    // DashboardOverview uebergeben bei jedem Render eine neue
    // Funktionsreferenz (z. B. "() => setToastMessage(null)") - mit
    // onDismiss in den Deps wuerde JEDER Re-Render des Elternteils den
    // Timer neu starten, solange der Toast sichtbar ist, und ihn so
    // effektiv auf unbestimmte Zeit offen halten statt nach 3s zu
    // schliessen. Der Effekt soll ausschliesslich an echte
    // message-Wechsel gekoppelt sein.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
