"use client";

import { useActionState } from "react";
import { updateReminderSettings } from "@/app/actions/settings";

export function ReminderSettingsForm({
  initialRemindBirthdays,
  initialRemindChristmas,
}: {
  initialRemindBirthdays: boolean;
  initialRemindChristmas: boolean;
}) {
  const [state, formAction, isPending] = useActionState(
    updateReminderSettings,
    undefined,
  );

  return (
    <div>
      {state?.error && (
        <p className="anim-in mb-3 rounded-lg border border-danger-line bg-danger-bg px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}
      {state?.success && (
        <p className="anim-in mb-3 rounded-lg border border-success-line bg-success-bg px-3 py-2 text-sm text-success">
          Einstellungen gespeichert.
        </p>
      )}

      <form action={formAction} className="form-stagger flex flex-col gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="remindBirthdays"
            defaultChecked={initialRemindBirthdays}
          />
          Geburtstagserinnerung per E-Mail
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="remindChristmas"
            defaultChecked={initialRemindChristmas}
          />
          Weihnachts-Statusübersicht per E-Mail
        </label>

        <button
          type="submit"
          disabled={isPending}
          className="btn btn-primary self-start"
        >
          {isPending ? "Wird gespeichert …" : "Speichern"}
        </button>
      </form>
    </div>
  );
}
