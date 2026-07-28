export function Disclaimer() {
  return (
    <div className="flex items-center justify-center gap-2 border-b border-amber-200/70 bg-amber-50/80 px-4 py-1.5 text-center text-[0.7rem] text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="shrink-0 opacity-80"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v5" />
        <path d="M12 16.5v.01" />
      </svg>
      Planning estimates only — not medical advice, diagnosis, or treatment,
      and no guaranteed outcome. Consult a qualified professional for medical
      or dietary guidance.
    </div>
  );
}
