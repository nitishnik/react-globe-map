import { useEffect } from 'react'

interface FlashToastProps {
  message: string | null
  onDone: () => void
}

export function FlashToast({ message, onDone }: FlashToastProps) {
  useEffect(() => {
    if (!message) return
    const t = window.setTimeout(onDone, 2200)
    return () => window.clearTimeout(t)
  }, [message, onDone])

  return (
    message ? (
      <div className="pointer-events-none absolute inset-x-4 bottom-10 z-30 mx-auto max-w-sm animate-[hm-rise_.2s_ease-out] rounded-full bg-[var(--hm-red)]/92 px-3 py-2 text-center font-[var(--hm-sans)] text-xs text-white shadow-lg backdrop-blur">
        {message}
      </div>
    ) : null
  )
}
