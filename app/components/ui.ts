// Shared Tailwind class strings for the hand-rolled design system used
// across every form/screen — no component library, but repeating this
// string in a dozen places would make a future tweak error-prone.

export const cardClass =
  "rounded-2xl border border-[var(--surface-border)] bg-[var(--surface)]/90 backdrop-blur-sm shadow-sm shadow-black/[0.03] p-5";

export const inputClass =
  "w-full rounded-lg border border-[var(--surface-border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none transition-colors focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/15";

export const primaryButtonClass =
  "rounded-full bg-[var(--brand)] px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[var(--brand-strong)] disabled:cursor-not-allowed disabled:opacity-50";

export const secondaryButtonClass =
  "rounded-full border border-[var(--surface-border)] bg-[var(--surface)] px-5 py-2.5 text-sm font-medium transition-colors hover:bg-[var(--brand-soft)]/60 disabled:cursor-not-allowed disabled:opacity-50";

export const smallButtonClass =
  "rounded-full border border-[var(--surface-border)] px-3 py-1 text-xs font-medium transition-colors hover:bg-[var(--brand-soft)]/60";
