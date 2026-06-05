import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/preact'
import userEvent from '@testing-library/user-event'
import CheckboxList from './CheckboxList'
import type { Municipality } from './CheckboxList'

afterEach(() => cleanup())

const MUNICIPALITIES: Municipality[] = [
  { code: '01101', name: '中央区', display_name: '札幌市 中央区', region: '石狩振興局' },
  { code: '01102', name: '北区', display_name: '札幌市 北区', region: '石狩振興局' },
  { code: '01202', name: '函館市', display_name: '函館市', region: '渡島総合振興局' },
]

describe('CheckboxList', () => {
  it('振興局グループ別に見出しを表示する', () => {
    render(
      <CheckboxList
        municipalities={MUNICIPALITIES}
        selected={new Set()}
        onToggle={vi.fn()}
      />,
    )
    expect(screen.getByText('石狩振興局')).toBeInTheDocument()
    expect(screen.getByText('渡島総合振興局')).toBeInTheDocument()
  })

  it('各市区町村のチェックボックスを表示する', () => {
    render(
      <CheckboxList
        municipalities={MUNICIPALITIES}
        selected={new Set()}
        onToggle={vi.fn()}
      />,
    )
    expect(screen.getByLabelText('中央区')).toBeInTheDocument()
    expect(screen.getByLabelText('北区')).toBeInTheDocument()
    expect(screen.getByLabelText('函館市')).toBeInTheDocument()
  })

  it('selected に含まれるコードのチェックボックスは checked になる', () => {
    render(
      <CheckboxList
        municipalities={MUNICIPALITIES}
        selected={new Set(['01101'])}
        onToggle={vi.fn()}
      />,
    )
    expect(screen.getByLabelText<HTMLInputElement>('中央区').checked).toBe(true)
    expect(screen.getByLabelText<HTMLInputElement>('北区').checked).toBe(false)
  })

  it('チェックボックスをクリックすると onToggle が対応コードで呼ばれる', async () => {
    const onToggle = vi.fn()
    render(
      <CheckboxList
        municipalities={MUNICIPALITIES}
        selected={new Set()}
        onToggle={onToggle}
      />,
    )
    await userEvent.click(screen.getByLabelText('中央区'))
    expect(onToggle).toHaveBeenCalledWith('01101')
  })

  it('regionActions が渡されたグループにボタンが表示される', () => {
    render(
      <CheckboxList
        municipalities={MUNICIPALITIES}
        selected={new Set()}
        onToggle={vi.fn()}
        regionActions={{ '石狩振興局': { label: '札幌市を一括選択', onClick: vi.fn() } }}
      />,
    )
    expect(screen.getByRole('button', { name: '札幌市を一括選択' })).toBeInTheDocument()
  })

  it('regionActions が未指定のときボタンは表示されない', () => {
    render(
      <CheckboxList
        municipalities={MUNICIPALITIES}
        selected={new Set()}
        onToggle={vi.fn()}
      />,
    )
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('regionActions にないグループにはボタンが表示されない', () => {
    render(
      <CheckboxList
        municipalities={MUNICIPALITIES}
        selected={new Set()}
        onToggle={vi.fn()}
        regionActions={{ '石狩振興局': { label: '札幌市を一括選択', onClick: vi.fn() } }}
      />,
    )
    expect(screen.queryAllByRole('button')).toHaveLength(1)
  })

  it('ボタンをクリックすると regionActions の onClick が呼ばれる', async () => {
    const onClick = vi.fn()
    render(
      <CheckboxList
        municipalities={MUNICIPALITIES}
        selected={new Set()}
        onToggle={vi.fn()}
        regionActions={{ '石狩振興局': { label: '札幌市を一括選択', onClick } }}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: '札幌市を一括選択' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('regionActions のラベルがそのままボタンに表示される', () => {
    render(
      <CheckboxList
        municipalities={MUNICIPALITIES}
        selected={new Set()}
        onToggle={vi.fn()}
        regionActions={{ '石狩振興局': { label: '札幌市の選択を解除', onClick: vi.fn() } }}
      />,
    )
    expect(screen.getByRole('button', { name: '札幌市の選択を解除' })).toBeInTheDocument()
  })
})
