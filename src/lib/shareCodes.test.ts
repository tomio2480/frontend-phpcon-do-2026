import { describe, it, expect } from 'vitest'
import { encodeSelection, decodeSelection } from './shareCodes'

// 194 件相当の連番コードを並び順の安定した全体集合として用いる
const allCodes = Array.from({ length: 194 }, (_, i) => String(i).padStart(5, '0'))

describe('encodeSelection', () => {
  it('空選択は空文字列を返す', () => {
    expect(encodeSelection([], allCodes)).toBe('')
  })

  it('全選択でも 50 文字以下に収まる', () => {
    expect(encodeSelection(allCodes, allCodes).length).toBeLessThanOrEqual(50)
  })

  it('URL 安全な文字（A-Z a-z 0-9 - _）のみを含む', () => {
    expect(encodeSelection(allCodes, allCodes)).toMatch(/^[A-Za-z0-9_-]*$/)
  })

  it('全体集合に無いコードは無視する', () => {
    const token = encodeSelection(['99999', '00001'], allCodes)
    expect(decodeSelection(token, allCodes)).toEqual(['00001'])
  })
})

describe('decodeSelection', () => {
  it('空文字列は空配列を返す', () => {
    expect(decodeSelection('', allCodes)).toEqual([])
  })

  it('不正なトークンは空配列を返す', () => {
    expect(decodeSelection('@@@invalid@@@', allCodes)).toEqual([])
  })

  it('短いトークンでも例外を投げず復元できる', () => {
    const token = encodeSelection(['00000'], allCodes)
    expect(decodeSelection(token, allCodes)).toEqual(['00000'])
  })
})

describe('encode と decode の往復', () => {
  it('順不同の選択を全体集合の並び順で復元する', () => {
    const selected = ['00193', '00007', '00000', '00100']
    const token = encodeSelection(selected, allCodes)
    expect(decodeSelection(token, allCodes)).toEqual(['00000', '00007', '00100', '00193'])
  })

  it('全選択を完全に復元する', () => {
    const token = encodeSelection(allCodes, allCodes)
    expect(decodeSelection(token, allCodes)).toEqual(allCodes)
  })
})
