import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PasswordResetRequestForm } from "@/components/password-reset-request-form";

export default function PasswortVergessenPage() {
  return (
    <>
      <SiteHeader />

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-10">
        <Link
          href="/"
          className="w-fit text-sm text-neutral-600 hover:underline dark:text-neutral-400"
        >
          ‹ Zurück zur Startseite
        </Link>

        <PasswordResetRequestForm />
      </main>

      <SiteFooter />
    </>
  );
}
