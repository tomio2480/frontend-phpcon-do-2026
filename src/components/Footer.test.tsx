import { cleanup, render, screen } from '@testing-library/preact'
import { afterEach, describe, expect, it } from 'vitest'
import Footer, { REPO_URL, SPONSORS_URL, HATENA_BLOG_URL } from './Footer'

afterEach(() => cleanup())

describe('Footer', () => {
  it('データ出典の見出しを持つ', () => {
    render(<Footer />)
    expect(screen.getByRole('heading', { name: /データ出典/ })).toBeTruthy()
  })

  it('GitHub 公開リポジトリへのリンクを描画する', () => {
    render(<Footer />)
    const link = screen.getByRole('link', { name: /GitHub リポジトリ（新しいタブで開きます）/ }) as HTMLAnchorElement
    expect(link.href).toBe(REPO_URL)
    expect(link.target).toBe('_blank')
    expect(link.rel).toContain('noopener')
  })

  it('GPL v2 で公開されている旨に言及する', () => {
    render(<Footer />)
    expect(screen.getByText(/GPL v2/)).toBeTruthy()
  })

  it('支援セクションの見出しを持つ', () => {
    render(<Footer />)
    expect(screen.getByRole('heading', { name: /tomio2480 を支援する/ })).toBeTruthy()
  })

  it('GitHub Sponsors へのリンクを描画する', () => {
    render(<Footer />)
    const link = screen.getByRole('link', { name: /GitHub Sponsors（新しいタブで開きます）/ }) as HTMLAnchorElement
    expect(link.href).toBe(SPONSORS_URL)
    expect(link.target).toBe('_blank')
  })

  it('はてなブログ（Codoc 寄付ボタン）へのリンクを描画する', () => {
    render(<Footer />)
    const link = screen.getByRole('link', { name: /はてなブログ（新しいタブで開きます）/ }) as HTMLAnchorElement
    expect(link.href).toBe(HATENA_BLOG_URL)
    expect(link.target).toBe('_blank')
  })

  it('寄付ボタンの場所を案内する文言を含む', () => {
    render(<Footer />)
    expect(screen.getByText(/右カラム/)).toBeTruthy()
  })

  it('コピーライト表記を含む', () => {
    render(<Footer />)
    expect(screen.getByText(/© 2026 tomio2480/)).toBeTruthy()
  })

  it('コピーライト表記を中央揃えで描画する', () => {
    render(<Footer />)
    const copyright = screen.getByText(/© 2026 tomio2480/)
    expect(copyright.className).toContain('text-center')
  })
})
