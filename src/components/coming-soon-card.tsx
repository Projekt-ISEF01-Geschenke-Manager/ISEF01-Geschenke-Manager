// Platzhalter-Karte fuer Bereiche, die laut Wireframe (Personenseite,
// Kernansicht 2) erst in einer spaeteren Ausbaustufe umgesetzt werden
// (Fruehere Geschenke #21, Vorschlaege #85). Gestrichelter statt
// durchgezogener Rahmen kennzeichnet bewusst "noch nicht echt", analog zur
// gestrichelten "+ Person anlegen"-Kachel (PersonSearchList).
export function ComingSoonCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-neutral-300 p-6 dark:border-neutral-700">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
        {description}
      </p>
    </div>
  );
}
