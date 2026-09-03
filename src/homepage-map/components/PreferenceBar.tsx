import { AUDIENCES, type AudienceId } from '../types'
import { audienceMatchCount } from '../ranking'

interface PreferenceBarProps {
  aud: AudienceId
  onChange: (id: AudienceId) => void
}

export function PreferenceBar({ aud, onChange }: PreferenceBarProps) {
  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {AUDIENCES.map((a) => {
        const n = audienceMatchCount(a.id)
        const pressed = a.id === aud
        return (
          <button
            key={a.id}
            type="button"
            aria-pressed={pressed}
            onClick={() => onChange(a.id)}
            className={`inline-flex h-11 shrink-0 items-center gap-2 rounded-full border px-3.5 font-[var(--hm-sans)] text-sm font-medium transition ${
              pressed
                ? 'border-[var(--hm-red)] bg-[var(--hm-red)] text-white shadow-[0_8px_20px_rgba(230,57,70,0.28)]'
                : 'border-[var(--hm-hair2)] bg-[var(--hm-wash)] text-[var(--hm-ink)] hover:border-[var(--hm-ink3)] hover:bg-white'
            }`}
          >
            {a.label}
            <span
              className={`rounded-full px-1.5 text-[11px] font-semibold ${
                pressed
                  ? 'bg-white/20 text-white'
                  : 'bg-white text-[var(--hm-ink2)]'
              }`}
            >
              {n}
            </span>
          </button>
        )
      })}
    </div>
  )
}
