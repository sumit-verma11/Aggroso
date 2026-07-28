"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/profile", label: "Profile" },
  { href: "/log", label: "Log meal" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/plan", label: "Meal plan" },
];

function LogoMark() {
  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--brand)] text-white shadow-sm">
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 21c-4.4 0-8-3.6-8-8 0-6 8-11 8-11s8 5 8 11c0 4.4-3.6 8-8 8Z" />
        <path d="M12 21v-8" />
      </svg>
    </span>
  );
}

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-10 border-b border-[var(--surface-border)] bg-[var(--surface)]/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3 sm:gap-6">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 font-semibold tracking-tight"
        >
          <LogoMark />
          <span className="hidden sm:inline">Nutrition Planner</span>
        </Link>
        <div className="flex min-w-0 gap-1 overflow-x-auto text-sm">
          {LINKS.map((link) => {
            const active = pathname?.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={
                  active
                    ? "shrink-0 whitespace-nowrap rounded-full bg-[var(--brand-soft)] px-3 py-1.5 font-medium text-[var(--brand-strong)]"
                    : "shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-zinc-600 hover:bg-[var(--brand-soft)]/60 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
                }
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
