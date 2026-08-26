import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LotteryScreen } from './LotteryScreen'
import type { UseAppState } from '../hooks/useAppState'
import type { LotteryResult } from '../domain/lottery'

vi.mock('../domain/lottery', () => ({
  drawSet: vi.fn(() => [
    { filling: '鮭', seasoning: '塩' },
    { filling: '梅', seasoning: '醤油' },
    { filling: 'おかか', seasoning: '塩' },
    { filling: '昆布', seasoning: 'なし' },
    { filling: 'ツナマヨ', seasoning: 'ごま油' },
  ] as LotteryResult[]),
}))
vi.mock('../domain/lottery2', () => ({
  drawSetTwoFillings: vi.fn(() => [
    { filling: '鮭', filling2: '梅', seasoning: '塩' },
    { filling: '昆布', filling2: 'たまご', seasoning: '醤油' },
    { filling: 'おかか', filling2: '明太子', seasoning: '塩' },
    { filling: '鮭', filling2: '昆布', seasoning: 'なし' },
    { filling: 'ツナマヨ', filling2: '梅', seasoning: 'ごま油' },
  ]),
}))

const mk = (overrides: Partial<UseAppState> = {}): UseAppState => ({
  state: {
    fillings: ['鮭', '梅', 'おかか'],
    seasonings: ['塩', '醤油'],
    history: [],
  },
  storageAvailable: true,
  addFilling: vi.fn(),
  removeFilling: vi.fn(),
  updateFilling: vi.fn(),
  addSeasoning: vi.fn(),
  removeSeasoning: vi.fn(),
  updateSeasoning: vi.fn(),
  recordDraw: vi.fn(),
  clearHistory: vi.fn(),
  ...overrides,
} as UseAppState)

const findSpin = () => screen.getByRole('button', { name: 'おにる！' })

describe('LotteryScreen', () => {
  beforeEach(() => vi.clearAllMocks())

  it('「おにる！」押下で5組が番号付きで表示される', () => {
    const app = mk()
    render(<LotteryScreen app={app} />)
    fireEvent.click(findSpin())
    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(5)
    expect(items[0]).toHaveTextContent('鮭')
    expect(items[0]).toHaveTextContent('塩')
    expect(items[4]).toHaveTextContent('ツナマヨ')
  })

  it('ヒント文言(5組をまとめて抽選します)は存在しない', () => {
    render(<LotteryScreen app={mk()} />)
    expect(screen.queryByText(/まとめて抽選/)).not.toBeInTheDocument()
  })

  it('抽選結果は履歴に記録される(recordDraw 呼び出し)', () => {
    const app = mk()
    render(<LotteryScreen app={app} />)
    fireEvent.click(findSpin())
    expect(app.recordDraw).toHaveBeenCalledTimes(1)
    expect(app.recordDraw).toHaveBeenCalledWith([
      { filling: '鮭', seasoning: '塩' },
      { filling: '梅', seasoning: '醤油' },
      { filling: 'おかか', seasoning: '塩' },
      { filling: '昆布', seasoning: 'なし' },
      { filling: 'ツナマヨ', seasoning: 'ごま油' },
    ])
  })

  it('fillings 0件時は「おにる！」disabled + 案内文言', () => {
    const app = mk({ state: { fillings: [], seasonings: ['塩'], history: [] } as any })
    render(<LotteryScreen app={app} />)
    expect(findSpin()).toBeDisabled()
    expect(screen.getByText(/具を追加してください/)).toBeInTheDocument()
  })

  it('再抽選で結果が入れ替わる', async () => {
    const app = mk()
    const { drawSet } = await import('../domain/lottery')
    const mocked = vi.mocked(drawSet)
    render(<LotteryScreen app={app} />)
    fireEvent.click(findSpin())
    mocked.mockImplementationOnce(() => [
      { filling: '明太子', seasoning: '塩' },
      { filling: '明太子', seasoning: '塩' },
      { filling: '明太子', seasoning: '塩' },
      { filling: '明太子', seasoning: '塩' },
      { filling: '明太子', seasoning: '塩' },
    ])
    fireEvent.click(findSpin())
    expect(screen.getAllByRole('listitem')[0]).toHaveTextContent('明太子')
    expect(app.recordDraw).toHaveBeenCalledTimes(2)
  })

  it('再抽選時も spinCount が進みアニメーション用キーが変わる', async () => {
    const app = mk()
    render(<LotteryScreen app={app} />)
    fireEvent.click(findSpin())
    const list1 = screen.getByRole('list', { name: '抽選結果' })
    fireEvent.click(findSpin())
    const list2 = screen.getByRole('list', { name: '抽選結果' })
    expect(list1).not.toBe(list2)
  })

  describe('モード切替', () => {
    it('初期は1具モード。2具モードへ切替できる', () => {
      render(<LotteryScreen app={mk()} />)
      const one = screen.getByRole('radio', { name: '具1つ' })
      const two = screen.getByRole('radio', { name: '具2つ' })
      expect(one).toBeChecked()
      expect(two).not.toBeChecked()
      fireEvent.click(two)
      expect(two).toBeChecked()
    })

    it('2具モードで抽選すると2つの具が「×」区切りで表示され recordDraw も2具で呼ばれる', () => {
      const app = mk()
      render(<LotteryScreen app={app} />)
      fireEvent.click(screen.getByRole('radio', { name: '具2つ' }))
      fireEvent.click(findSpin())
      const items = screen.getAllByRole('listitem')
      expect(items).toHaveLength(5)
      expect(items[0]).toHaveTextContent('鮭')
      expect(items[0]).toHaveTextContent('梅')
      expect(app.recordDraw).toHaveBeenCalledWith([
        { filling: '鮭', filling2: '梅', seasoning: '塩' },
        { filling: '昆布', filling2: 'たまご', seasoning: '醤油' },
        { filling: 'おかか', filling2: '明太子', seasoning: '塩' },
        { filling: '鮭', filling2: '昆布', seasoning: 'なし' },
        { filling: 'ツナマヨ', filling2: '梅', seasoning: 'ごま油' },
      ])
    })

    it('具が1件しかない状態で2具モードは「おにる！」disabled', () => {
      const app = mk({ state: { fillings: ['鮭'], seasonings: ['塩'], history: [] } as any })
      render(<LotteryScreen app={app} />)
      fireEvent.click(screen.getByRole('radio', { name: '具2つ' }))
      expect(findSpin()).toBeDisabled()
      expect(screen.getByText(/具を2つ以上/)).toBeInTheDocument()
    })
  })
})
