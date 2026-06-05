import { SAPPORO_CODES } from '../hooks/useSelection'

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
  onToggleSapporo?: () => void
}

const ISHIKARI_REGION = '石狩振興局'

export default function CheckboxList({ municipalities, selected, onToggle, onToggleSapporo }: Props) {
  const grouped = municipalities.reduce<Record<string, Municipality[]>>((acc, m) => {
    if (!acc[m.region]) acc[m.region] = []
    acc[m.region].push(m)
    return acc
  }, {})

  const allSapporoSelected = SAPPORO_CODES.every(code => selected.has(code))

  return (
    <div>
      {Object.entries(grouped).map(([region, items]) => (
        <section key={region}>
          <h2>{region}</h2>
          {region === ISHIKARI_REGION && onToggleSapporo && (
            <button type="button" onClick={onToggleSapporo}>
              {allSapporoSelected ? '札幌市の選択を解除' : '札幌市を一括選択'}
            </button>
          )}
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
