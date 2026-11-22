import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireUser } from "@/lib/supabase/server";
import { ReminderSettingsForm } from "@/components/reminder-settings-form";

export const instant = false;

export default async function EinstellungenPage() {
  const { user } = await requireUser();

  // Fehlt das Feld (noch nie gespeichert) gilt es als aktiviert - nur ein
  // explizites false schaltet die Erinnerung ab.
  const remindBirthdays = user.user_metadata?.remind_birthdays !== false;
  const remindChristmas = user.user_metadata?.remind_christmas !== false;

  return (
    <main className="mx-auto flex w-full max-w-[1140px] flex-1 flex-col gap-7 px-6 pt-8 pb-14 2xl:max-w-[1600px]">
      <Link href="/dashboard" className="btn btn-secondary btn-sm w-fit">
        <ChevronLeft className="h-3.5 w-3.5 shrink-0" />
        Zurück zur Übersicht
      </Link>

      <div className="flex flex-col gap-1">
        <h1 className="text-[34px] font-bold text-h1">Einstellungen</h1>
        <p className="max-w-xl text-sm text-muted">
          Lege fest, welche Erinnerungs-E-Mails du erhalten möchtest.
        </p>
      </div>

      <section
        aria-labelledby="erinnerungen"
        className="surface reveal flex min-w-0 max-w-[480px] flex-col gap-4 rounded-2xl p-6"
      >
        <h2 id="erinnerungen" className="text-xl font-bold text-heading">
          Erinnerungen
        </h2>
        <ReminderSettingsForm
          initialRemindBirthdays={remindBirthdays}
          initialRemindChristmas={remindChristmas}
        />
      </section>
    </main>
  );
}
