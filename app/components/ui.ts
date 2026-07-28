// Shared Tailwind class strings for the hand-rolled design system used
// across every form/screen — no component library, but repeating this
// string in a dozen places would make a future tweak error-prone.

export const cardClass =
  "rounded-2xl border border-[var(--surface-border)] bg-[var(--surface)]/90 backdrop-blur-sm shadow-sm shadow-black/[0.03] p-5";

export const inputClass =
  "w-full rounded-lg border border-[var(--surface-border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none transition-colors focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/15";

// Light mode's --brand (#0f9d68) only gives white text 3.48:1 contrast —
// below WCAG AA's 4.5:1 for normal text. Dark mode's --brand (#2fd48a) is a
// bright mint that gives white text just 1.93:1. Fixed per-theme rather
// than picking one compromise color: light mode uses the darker
// --brand-strong with white text (5.16:1); dark mode keeps the brighter
// --brand but switches to dark text (9.2:1) instead of white. Verified with
// a WCAG relative-luminance contrast calculation, not by eye.
export const primaryButtonClass =
  "rounded-full bg-[var(--brand-strong)] px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:opacity-90 dark:bg-[var(--brand)] dark:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-50";

export const secondaryButtonClass =
  "rounded-full border border-[var(--surface-border)] bg-[var(--surface)] px-5 py-2.5 text-sm font-medium transition-colors hover:bg-[var(--brand-soft)]/60 disabled:cursor-not-allowed disabled:opacity-50";

export const smallButtonClass =
  "rounded-full border border-[var(--surface-border)] px-3 py-1 text-xs font-medium transition-colors hover:bg-[var(--brand-soft)]/60";
