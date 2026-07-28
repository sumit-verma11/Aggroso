"use client";

import { useEffect } from "react";

// Catches errors thrown by the root layout itself (app/error.tsx can't,
// since it renders inside that layout) — must render its own <html>/<body>.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled root layout error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white px-4 text-center text-zinc-900">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="text-sm text-zinc-500">
          The application failed to load. Please try again.
        </p>
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
