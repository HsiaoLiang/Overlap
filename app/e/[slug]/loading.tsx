/** Shown instantly while the event loads from the database. */
export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-6xl animate-pulse px-4 pt-4 pb-16 sm:px-6 sm:pt-8">
      <div className="h-8 w-64 max-w-full rounded-lg bg-subtle" />
      <div className="mt-3 h-4 w-80 max-w-full rounded bg-subtle" />
      <div className="mt-8 h-96 rounded-2xl bg-subtle" />
    </main>
  );
}
