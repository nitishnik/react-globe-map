import type { TierIndex } from '../types'

export interface PillFaceProps {
  label: string
  count?: number
  tier: TierIndex
  selected?: boolean
  quiet?: boolean
  showLabel?: boolean
  showCount?: boolean
}

export interface PillMarkerProps extends PillFaceProps {
  x: number
  y: number
  onClick: () => void
  zIndex?: number
}

const TIER_CNT: Record<TierIndex, string> = {
  0: 'bg-[var(--hm-red)] text-white',
  1: 'bg-[var(--hm-red)]/80 text-white',
  2: 'bg-[var(--hm-wash)] text-[var(--hm-ink)]',
  3: 'bg-transparent text-[var(--hm-ink)]',
}

function PinGlyph({
  selected = false,
  quiet = false,
}: {
  selected?: boolean
  quiet?: boolean
}) {
  const fill = quiet
    ? '#c9b8b4'
    : selected
      ? 'var(--hm-red-dk)'
      : 'var(--hm-red)'

  return (
    <svg
      width="22"
      height="28"
      viewBox="0 0 22 28"
      aria-hidden
      className="shrink-0 drop-shadow-[0_4px_8px_rgba(16,22,32,0.28)]"
    >
      <path
        d="M11 0C4.925 0 0 4.925 0 11c0 8.25 11 17 11 17s11-8.75 11-17C22 4.925 17.075 0 11 0z"
        fill={fill}
      />
      <circle cx="11" cy="11" r="4.1" fill="white" />
    </svg>
  )
}

export function PillFace({
  label,
  count,
  tier,
  selected = false,
  quiet = false,
  showLabel = true,
  showCount = true,
}: PillFaceProps) {
  const countVisible = showCount && typeof count === 'number' && count > 0

  return (
    <span className="inline-flex flex-col items-center">
      {showLabel ? (
        <span
          className={`mb-1 inline-flex max-w-[160px] items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 font-[var(--hm-sans)] text-[12px] font-semibold shadow-[0_6px_18px_rgba(16,22,32,0.16)] ${
            selected
              ? 'border-white bg-white text-[var(--hm-ink)]'
              : quiet
                ? 'border-white/80 bg-white/90 text-[var(--hm-ink)]'
                : 'border-white bg-white text-[var(--hm-ink)]'
          }`}
        >
          <span className="truncate">{label}</span>
          {countVisible ? (
            <span
              className={`ml-0.5 inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
                selected ? 'bg-[var(--hm-red)] text-white' : TIER_CNT[tier]
              }`}
            >
              {count}
            </span>
          ) : null}
        </span>
      ) : null}
      <PinGlyph selected={selected} quiet={quiet} />
    </span>
  )
}

export function PillMarker({
  x,
  y,
  onClick,
  zIndex = 10,
  selected = false,
  ...face
}: PillMarkerProps) {
  return (
    <button
      type="button"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      style={{ left: x, top: y, zIndex: selected ? zIndex + 20 : zIndex }}
      className="pointer-events-auto absolute flex min-h-11 min-w-11 -translate-x-1/2 -translate-y-[88%] items-center justify-center"
      aria-label={face.label}
    >
      <PillFace selected={selected} {...face} />
    </button>
  )
}
