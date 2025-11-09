"use client"

interface Props {
  steps: string[]
  current: number
  onSelect?: (index: number) => void
}

export default function WizardStepper({ steps, current, onSelect }: Props) {
  return (
    <div className="mb-6">
      <ol className="flex items-center w-full">
        {steps.map((label, idx) => {
          const active = idx === current
          const done = idx < current
          const canSelect = Boolean(onSelect) && idx <= current
          const commonCircle = `flex items-center justify-center h-8 w-8 rounded-full border text-sm font-semibold ${
            active
              ? 'bg-meu-primary text-white border-meu-primary'
              : done
              ? 'bg-green-500 text-white border-green-500'
              : 'bg-white text-gray-600 border-gray-300'
          }`
          const labelCls = `ml-2 text-sm ${active ? 'text-gray-900 font-medium' : 'text-gray-600'}`

          return (
            <li key={label} className="flex-1 flex items-center">
              {canSelect ? (
                <button
                  type="button"
                  onClick={() => onSelect && onSelect(idx)}
                  className="flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-meu-primary/50 rounded"
                  aria-current={active ? 'step' : undefined}
                >
                  <div className={`${commonCircle} cursor-pointer`}>
                    {done ? '✓' : idx + 1}
                  </div>
                  <span className={`${labelCls} cursor-pointer`}>{label}</span>
                </button>
              ) : (
                <div className={`flex items-center`}>
                  <div className={commonCircle}>
                    {done ? '✓' : idx + 1}
                  </div>
                  <span className={labelCls}>{label}</span>
                </div>
              )}
              {idx < steps.length - 1 && (
                <div className={`flex-1 h-px mx-3 ${idx < current ? 'bg-green-500' : 'bg-gray-200'}`} />
              )}
            </li>
          )}
        )}
      </ol>
    </div>
  )
}
