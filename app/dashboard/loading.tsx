export default function DashboardLoading() {
  return (
    <div className="mx-auto w-full max-w-2xl animate-pulse px-4 py-10">
      <div className="mb-1 h-7 w-40 rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="mb-6 h-4 w-96 rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-40 rounded bg-zinc-100 dark:bg-zinc-900" />
    </div>
  );
}
