import { cleanup, render, screen } from '@testing-library/preact'
import { afterEach, describe, expect, it } from 'vitest'
import ExternalLink from './ExternalLink'

afterEach(() => cleanup())

describe('ExternalLink', () => {
  it('text をリンクとして描画する', () => {
    render(<ExternalLink href="https://example.com" text="サンプル" />)
    expect(screen.getByRole('link', { name: 'サンプル（新しいタブで開きます）' })).toBeTruthy()
  })

  it('href を設定する', () => {
    render(<ExternalLink href="https://example.com" text="サンプル" />)
    const link = screen.getByRole('link') as HTMLAnchorElement
    expect(link.href).toBe('https://example.com/')
  })

  it('target="_blank" で新規タブを開く', () => {
    render(<ExternalLink href="https://example.com" text="サンプル" />)
    expect((screen.getByRole('link') as HTMLAnchorElement).target).toBe('_blank')
  })

  it('rel に noopener と noreferrer が含まれる', () => {
    render(<ExternalLink href="https://example.com" text="サンプル" />)
    const link = screen.getByRole('link') as HTMLAnchorElement
    expect(link.rel).toContain('noopener')
    expect(link.rel).toContain('noreferrer')
  })

  it('aria-label に新しいタブで開く旨を含む', () => {
    render(<ExternalLink href="https://example.com" text="サンプル" />)
    const link = screen.getByRole('link') as HTMLAnchorElement
    expect(link.getAttribute('aria-label')).toContain('新しいタブ')
  })

  it('本文と区別できる専用リンク色と下線を付与する', () => {
    render(<ExternalLink href="https://example.com" text="サンプル" />)
    const link = screen.getByRole('link') as HTMLAnchorElement
    expect(link.className).toContain('text-link')
    expect(link.className).toContain('underline')
  })
})
