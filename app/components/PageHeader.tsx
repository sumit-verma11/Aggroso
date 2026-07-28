export function PageHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-8">
      <div className="mb-3 h-1 w-10 rounded-full bg-[var(--brand)]" />
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {description && (
        <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
          {description}
        </p>
      )}
    </div>
  );
}
