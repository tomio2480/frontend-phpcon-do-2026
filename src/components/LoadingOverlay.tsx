type Props = {
  isLoading: boolean
}

export default function LoadingOverlay({ isLoading }: Props) {
  if (!isLoading) return null

  return (
    <div
      role="status"
      class="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
    >
      <p class="text-text text-lg font-medium">PHP エンジンを読み込み中…</p>
    </div>
  )
}
