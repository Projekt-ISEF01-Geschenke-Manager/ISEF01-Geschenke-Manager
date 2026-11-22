import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { RegisterForm } from "@/components/register-form";

export default function RegisterPage() {
  return (
    <>
      <SiteHeader />

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-10">
        <Link href="/" className="w-fit text-sm text-muted hover:underline">
          ‹ Zurück zur Startseite
        </Link>

        <RegisterForm />
      </main>

      <SiteFooter />
    </>
  );
}
