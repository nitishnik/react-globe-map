export default function Loading() {
  return (
    <main
      className="min-h-screen animate-pulse bg-[var(--hm-page)] px-4 py-10 sm:px-6"
      aria-label="Loading recommendation level"
    >
      <div className="mx-auto max-w-[1180px]">
        <div className="h-4 w-36 rounded bg-[var(--hm-hair)]" />
        <div className="mt-4 h-14 max-w-2xl rounded-xl bg-[var(--hm-hair)]" />
        <div className="mt-10 h-[560px] rounded-[28px] border border-[var(--hm-hair)] bg-white" />
      </div>
    </main>
  )
}
