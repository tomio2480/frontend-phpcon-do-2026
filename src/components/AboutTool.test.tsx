import { cleanup, render, screen } from '@testing-library/preact'
import { afterEach, describe, expect, it } from 'vitest'
import AboutTool, { LT_VIDEO_URL, LT_VIDEO_TITLE } from './AboutTool'

afterEach(() => cleanup())

describe('AboutTool', () => {
  it('LT 動画へのリンクを描画する', () => {
    render(<AboutTool />)
    const link = screen.getByRole('link', { name: LT_VIDEO_TITLE }) as HTMLAnchorElement
    expect(link.href).toBe(LT_VIDEO_URL)
  })

  it('LT 動画リンクは新規タブで開く', () => {
    render(<AboutTool />)
    const link = screen.getByRole('link', { name: LT_VIDEO_TITLE }) as HTMLAnchorElement
    expect(link.target).toBe('_blank')
    expect(link.rel).toContain('noopener')
  })

  it('「Claude からのおすすめポイント」の見出しを持つ', () => {
    render(<AboutTool />)
    expect(screen.getByRole('heading', { name: /Claude からのおすすめポイント/ })).toBeTruthy()
  })

  it('php-wasm への言及を含む', () => {
    render(<AboutTool />)
    expect(screen.getByText(/php-wasm/)).toBeTruthy()
  })

  it('「tomio2480 のおすすめポイント」の見出しを持つ', () => {
    render(<AboutTool />)
    expect(screen.getByRole('heading', { name: /tomio2480 のおすすめポイント/ })).toBeTruthy()
  })

  it('tomio2480 の推し文を含む', () => {
    render(<AboutTool />)
    expect(screen.getByText(/自分と北海道がどれだけ一体となれているのかを定量的に感じてください/)).toBeTruthy()
  })
})
