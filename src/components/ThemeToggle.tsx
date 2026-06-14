import type { ThemePreference } from '../hooks/useTheme'

type Props = {
  pref: ThemePreference
  onCycle: () => void
}

const ICON: Record<ThemePreference, string> = {
  auto:  '◐',
  light: '○',
  dark:  '●',
}

const LABEL: Record<ThemePreference, string> = {
  auto:  '自動',
  light: 'ライト',
  dark:  'ダーク',
}

export default function ThemeToggle({ pref, onCycle }: Props) {
  return (
    <button
      type="button"
      onClick={onCycle}
      aria-label={`テーマ: ${LABEL[pref]}（クリックで切り替え）`}
      title={`現在のテーマ: ${LABEL[pref]}`}
      class="flex items-center gap-1 rounded-md border border-text/20 px-3 py-1 text-sm text-text-2 hover:bg-text/5 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-lavender"
    >
      <span aria-hidden="true">{ICON[pref]}</span>
      <span>{LABEL[pref]}</span>
    </button>
  )
}
