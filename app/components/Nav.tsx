import Link from "next/link";

const LINKS = [
  { href: "/profile", label: "Profile" },
  { href: "/log", label: "Log meal" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/plan", label: "Meal plan" },
];

export function Nav() {
  return (
    <nav className="border-b border-zinc-200 dark:border-zinc-800">
      <div className="mx-auto flex max-w-3xl items-center gap-6 px-4 py-3">
        <Link href="/" className="font-semibold">
          Nutrition Planner
        </Link>
        <div className="flex gap-4 text-sm">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
