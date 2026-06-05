import { cleanup, render, screen } from '@testing-library/preact'
import { afterEach, describe, expect, it } from 'vitest'
import ShareButton, { buildPostText, buildXUrl } from './ShareButton'

const sampleResult = {
  area_pct: 12.34,
  population_pct: 56.78,
  furusato_amount_pct: 9.01,
  furusato_count_pct: 23.45,
}

afterEach(() => cleanup())

describe('buildPostText', () => {
  it('ハッシュタグ #あなたの北海道は何パーセント を含む', () => {
    expect(buildPostText(sampleResult)).toContain('#あなたの北海道は何パーセント')
  })

  it('ハッシュタグ #frontend_phpcon_do を含む', () => {
    expect(buildPostText(sampleResult)).toContain('#frontend_phpcon_do')
  })

  it('面積のパーセンテージを含む', () => {
    expect(buildPostText(sampleResult)).toContain('12.34')
  })

  it('人口のパーセンテージを含む', () => {
    expect(buildPostText(sampleResult)).toContain('56.78')
  })
})

describe('buildXUrl', () => {
  it('https://x.com/intent/post で始まる', () => {
    expect(buildXUrl('hello')).toMatch(/^https:\/\/x\.com\/intent\/post/)
  })

  it('text パラメタを encodeURIComponent でエスケープする', () => {
    const text = 'hello world #test'
    expect(buildXUrl(text)).toContain(`text=${encodeURIComponent(text)}`)
  })

  it('hashtags パラメタを含まない', () => {
    expect(buildXUrl('test')).not.toContain('hashtags=')
  })
})

describe('ShareButton', () => {
  it('リンク要素を描画する', () => {
    render(<ShareButton result={sampleResult} />)
    expect(screen.getByRole('link')).toBeTruthy()
  })

  it('href が x.com/intent/post を含む', () => {
    render(<ShareButton result={sampleResult} />)
    const link = screen.getByRole('link') as HTMLAnchorElement
    expect(link.href).toContain('https://x.com/intent/post')
  })

  it('href がハッシュタグ文字列をエスケープして含む', () => {
    render(<ShareButton result={sampleResult} />)
    const link = screen.getByRole('link') as HTMLAnchorElement
    expect(link.href).toContain(encodeURIComponent('#あなたの北海道は何パーセント'))
  })

  it('target="_blank" で新規タブを開く', () => {
    render(<ShareButton result={sampleResult} />)
    const link = screen.getByRole('link') as HTMLAnchorElement
    expect(link.target).toBe('_blank')
  })

  it('rel に noopener と noreferrer が含まれる', () => {
    render(<ShareButton result={sampleResult} />)
    const link = screen.getByRole('link') as HTMLAnchorElement
    expect(link.rel).toContain('noopener')
    expect(link.rel).toContain('noreferrer')
  })

  it('aria-label に新しいタブで開くことを示す文言がある', () => {
    render(<ShareButton result={sampleResult} />)
    const link = screen.getByRole('link') as HTMLAnchorElement
    expect(link.getAttribute('aria-label')).toContain('新しいタブ')
  })
})
