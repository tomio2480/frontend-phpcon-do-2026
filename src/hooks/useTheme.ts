import { useState, useEffect, useCallback } from 'preact/hooks'

export type ThemePreference = 'auto' | 'light' | 'dark'

const CYCLE: Record<ThemePreference, ThemePreference> = {
  auto: 'light',
  light: 'dark',
  dark: 'auto',
}

const LABELS: Record<ThemePreference, string> = {
  auto:  '自動',
  light: 'ライト',
  dark:  'ダーク',
}

function systemDarkNow(): boolean {
  return typeof window !== 'undefined'
    ? (window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false)
    : false
}

export function useTheme() {
  const [pref, setPref] = useState<ThemePreference>(() => {
    const stored = typeof window !== 'undefined'
      ? (localStorage.getItem('theme') as ThemePreference | null)
      : null
    return stored ?? 'auto'
  })

  const [sysDark, setSysDark] = useState(systemDarkNow)

  // システムの prefers-color-scheme 変化を購読する
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => setSysDark(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const isDark = pref === 'dark' ? true : pref === 'light' ? false : sysDark

  // html[data-theme] を更新する
  useEffect(() => {
    if (typeof document === 'undefined') return
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
  }, [isDark])

  const cycleTheme = useCallback(() => {
    setPref(prev => {
      const next = CYCLE[prev]
      if (typeof window !== 'undefined') localStorage.setItem('theme', next)
      return next
    })
  }, [])

  return { pref, isDark, cycleTheme, label: LABELS[pref] }
}
