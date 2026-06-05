export type Municipality = {
  code: string
  name: string
  display_name: string
  region: string
}

type RegionAction = {
  label: string
  onClick: () => void
}

type Props = {
  municipalities: Municipality[]
  selected: Set<string>
  onToggle: (code: string) => void
  regionActions?: Record<string, RegionAction>
}

export default function CheckboxList({ municipalities, selected, onToggle, regionActions }: Props) {
  const grouped = municipalities.reduce<Record<string, Municipality[]>>((acc, m) => {
    if (!acc[m.region]) acc[m.region] = []
    acc[m.region].push(m)
    return acc
  }, {})

  return (
    <div class="mt-4 space-y-3">
      {Object.entries(grouped).map(([region, items]) => {
        const action = regionActions?.[region]
        return (
          <section key={region} class="rounded-lg border border-accent-lavender/40 bg-white/40 p-3">
            <h2 class="font-semibold text-text mb-2">{region}</h2>
            {action && (
              <button
                type="button"
                onClick={action.onClick}
                class="mb-2 rounded px-2 py-1 text-xs font-medium bg-accent-yellow text-text hover:bg-accent-yellow/70 transition-colors"
              >
                {action.label}
              </button>
            )}
            <ul class="flex flex-wrap gap-x-4 gap-y-1">
              {items.map(m => (
                <li key={m.code}>
                  <label class="flex items-center gap-1 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selected.has(m.code)}
                      onChange={() => onToggle(m.code)}
                      class="accent-accent-lilac"
                    />
                    {m.name}
                  </label>
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
