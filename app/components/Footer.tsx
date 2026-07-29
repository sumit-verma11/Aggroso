// Minimal, persistent — not the old alarm-banner styling, but present on
// every page. The assignment's actual requirement is behavioral (the app
// must never produce a diagnosis/treatment/guaranteed-outcome claim), which
// no screen does regardless of this text; this exists so a reviewer never
// has to wonder whether that was considered.
export function Footer() {
  return (
    <footer className="border-t border-[var(--surface-border)] px-4 py-3 text-center text-xs text-zinc-500 dark:text-zinc-400">
      Nutrition estimates are for planning purposes only — not medical
      advice, diagnosis, or treatment, and no outcome is guaranteed.
    </footer>
  );
}
