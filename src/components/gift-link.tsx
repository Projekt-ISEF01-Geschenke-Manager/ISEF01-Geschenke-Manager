import { ExternalLink } from "lucide-react";
import { shortLink } from "@/lib/url";

// Link zum Produkt als kleine Pille: rundes Symbol links, Hostname (und
// optional ein Label wie "Zum Angebot") rechts. Ein einziges Symbol, das
// beim Hover leicht nach oben rechts wandert; die Pille hebt sich an und
// bekommt den Akzentrand wie die Karten. href bleibt der volle Link.
export function GiftLink({
  href,
  label,
  title,
}: {
  href: string;
  label?: string;
  title?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={title}
      className="group inline-flex max-w-full items-center gap-2 rounded-full border border-line bg-subtle py-1 pr-3 pl-1 text-xs transition duration-150 hover:-translate-y-px hover:border-accent hover:bg-accent-soft motion-reduce:transition-none motion-reduce:hover:transform-none"
    >
      <span
        aria-hidden="true"
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-card text-accent"
      >
        <ExternalLink className="h-3 w-3 transition-transform duration-150 group-hover:translate-x-px group-hover:-translate-y-px motion-reduce:transition-none" />
      </span>
      {label && <span className="font-semibold text-heading">{label}</span>}
      <span className={`truncate ${label ? "text-muted" : "font-medium text-heading"}`}>
        {shortLink(href)}
      </span>
    </a>
  );
}
