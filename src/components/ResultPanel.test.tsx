import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/preact'
import ResultPanel from './ResultPanel'
import type { AggregateResult } from '../hooks/usePhp'

afterEach(() => cleanup())

const RESULT: AggregateResult = {
  area_pct: 12.34,
  population_pct: 56.78,
  furusato_amount_pct: 3.0,
  furusato_count_pct: 100.0,
}

describe('ResultPanel', () => {
  it('result が null のとき選択を促すメッセージを表示する', () => {
    render(<ResultPanel result={null} isCalculating={false} />)
    expect(screen.getByText('市区町村を選択してください')).toBeInTheDocument()
  })

  it('isCalculating のとき集計中メッセージを表示する', () => {
    render(<ResultPanel result={null} isCalculating={true} />)
    expect(screen.getByText('集計中…')).toBeInTheDocument()
  })

  it('4 指標を %.2f% 形式で表示する', () => {
    render(<ResultPanel result={RESULT} isCalculating={false} />)
    expect(screen.getByText('12.34%')).toBeInTheDocument()
    expect(screen.getByText('56.78%')).toBeInTheDocument()
    expect(screen.getByText('3.00%')).toBeInTheDocument()
    expect(screen.getByText('100.00%')).toBeInTheDocument()
  })

  it('面積・人口・ふるさと納税額・件数のラベルを表示する', () => {
    render(<ResultPanel result={RESULT} isCalculating={false} />)
    expect(screen.getByText('面積')).toBeInTheDocument()
    expect(screen.getByText('人口')).toBeInTheDocument()
    expect(screen.getByText('ふるさと納税額')).toBeInTheDocument()
    expect(screen.getByText('ふるさと納税件数')).toBeInTheDocument()
  })
})