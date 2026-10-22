import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export default function CheckEmailPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4 px-4 py-10 text-center">
        <h1 className="text-2xl font-semibold">Fast geschafft</h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          Wir haben dir eine E-Mail mit einem Bestätigungslink geschickt.
          Klicke darauf, um die Registrierung abzuschließen.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
