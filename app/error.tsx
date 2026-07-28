"use client";

import { useEffect } from "react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled application error:", error);
  }, [error]);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-4 px-4 py-20 text-center">
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        An unexpected error occurred. Nothing is saved without your explicit
        confirmation, so any data you were entering is still safe.
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-full bg-[var(--brand)] px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-[var(--brand-strong)]"
      >
        Try again
      </button>
    </div>
  );
}
