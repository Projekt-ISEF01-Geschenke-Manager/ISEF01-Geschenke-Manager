// Reines Durchreiche-Layout. Existiert, damit revalidatePath(path, "layout")
// in den Server Actions sowohl /dashboard als auch verschachtelte Routen
// wie /dashboard/personen/[id] abdeckt, ohne jede ID einzeln nachschlagen
// zu muessen.
export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return children;
}
