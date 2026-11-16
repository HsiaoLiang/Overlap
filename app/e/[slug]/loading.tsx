/** Shown instantly while the event loads from the database. */
export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-6xl animate-pulse px-4 pt-4 pb-16 sm:px-6 sm:pt-8">
      <div className="glass h-36 rounded-3xl" />
      <div className="glass mt-4 h-96 rounded-2xl" />
    </main>
  );
}
