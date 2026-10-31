"use client";

import type { ReactNode, RefObject } from "react";

// Schlichtes Popup auf Basis von <dialog> (native Escape-Taste,
// Fokus-Handling und Top-Layer kommen vom Browser, kein zusaetzliches
// Fokus-Trap-Package noetig). Klick auf den Hintergrund (::backdrop)
// schliesst - erkennbar daran, dass event.target dann das <dialog>-Element
// selbst ist, nicht eines seiner Kinder (siehe onClick unten).
export function Modal({
  dialogRef,
  title,
  children,
}: {
  dialogRef: RefObject<HTMLDialogElement | null>;
  title: string;
  children: ReactNode;
}) {
  return (
    <dialog
      ref={dialogRef}
      aria-label={title}
      // Tailwinds Preflight setzt margin:0 auf allen Elementen, deshalb
      // greift das margin:auto-Zentrieren aus dem UA-Stylesheet von
      // dialog:modal nicht mehr (Dialog landet sonst oben links) - Position
      // daher explizit per fixed + translate statt margin:auto.
      className="fixed top-1/2 left-1/2 max-h-[calc(100vh-2rem)] w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border-none bg-white p-0 text-neutral-900 shadow-xl backdrop:bg-black/50 dark:bg-neutral-900 dark:text-white"
      onClick={(event) => {
        if (event.target === dialogRef.current) {
          dialogRef.current?.close();
        }
      }}
    >
      <div className="flex items-center justify-between border-b border-neutral-200 p-4 dark:border-neutral-800">
        <h2 className="text-lg font-semibold">{title}</h2>
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          aria-label="Schließen"
          className="cursor-pointer rounded-full p-1 text-neutral-500 transition hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          ✕
        </button>
      </div>
      <div className="p-4">{children}</div>
    </dialog>
  );
}
