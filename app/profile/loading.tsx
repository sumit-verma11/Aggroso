export default function ProfileLoading() {
  return (
    <div className="mx-auto w-full max-w-xl animate-pulse px-4 py-10">
      <div className="mb-1 h-7 w-40 rounded bg-[var(--surface-border)]" />
      <div className="mb-6 h-4 w-72 rounded bg-[var(--surface-border)]" />
      <div className="flex flex-col gap-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 rounded bg-[var(--brand-soft)]" />
        ))}
      </div>
    </div>
  );
}
