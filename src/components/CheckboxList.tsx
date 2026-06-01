export type Municipality = {
  code: string
  name: string
  display_name: string
  region: string
}

type Props = {
  municipalities: Municipality[]
  selected: Set<string>
  onToggle: (code: string) => void
}

export default function CheckboxList({ municipalities, selected, onToggle }: Props) {
  const grouped = municipalities.reduce<Record<string, Municipality[]>>((acc, m) => {
    if (!acc[m.region]) acc[m.region] = []
    acc[m.region].push(m)
    return acc
  }, {})

  return (
    <div>
      {Object.entries(grouped).map(([region, items]) => (
        <section key={region}>
          <h2>{region}</h2>
          <ul>
            {items.map(m => (
              <li key={m.code}>
                <label>
                  <input
                    type="checkbox"
                    checked={selected.has(m.code)}
                    onChange={() => onToggle(m.code)}
                  />
                  {m.name}
                </label>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
