type Props = {
  isLoading: boolean
}

export default function LoadingOverlay({ isLoading }: Props) {
  if (!isLoading) return null

  return (
    <div
      role="status"
      aria-live="polite"
      class="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background"
    >
      <span
        aria-hidden="true"
        class="h-12 w-12 rounded-full border-4 border-accent-lavender/30 border-t-accent-lavender animate-spin motion-reduce:animate-none"
      />
      <p class="text-text text-base font-medium">読み込み中…</p>
    </div>
  )
}
