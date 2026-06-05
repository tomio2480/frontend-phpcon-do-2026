import { cleanup, render, screen } from '@testing-library/preact'
import { afterEach, describe, expect, it } from 'vitest'
import LoadingOverlay from './LoadingOverlay'

describe('LoadingOverlay', () => {
  afterEach(() => cleanup())

  it('isLoading=true のとき読み込み中メッセージを表示する', () => {
    render(<LoadingOverlay isLoading />)
    expect(screen.getByRole('status')).toBeTruthy()
    expect(screen.getByText('PHP エンジンを読み込み中…')).toBeTruthy()
  })

  it('isLoading=false のとき何も描画しない', () => {
    const { container } = render(<LoadingOverlay isLoading={false} />)
    expect(container.firstChild).toBeNull()
  })
})
