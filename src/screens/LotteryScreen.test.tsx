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

describe('LotteryScreen', () => {
  beforeEach(() => vi.clearAllMocks())

  it('「まわす」押下で5組が番号付きで表示される', () => {
    const app = mk()
    render(<LotteryScreen app={app} />)
    fireEvent.click(screen.getByRole('button', { name: 'まわす' }))
    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(5)
    expect(items[0]).toHaveTextContent('鮭')
    expect(items[0]).toHaveTextContent('塩')
    expect(items[4]).toHaveTextContent('ツナマヨ')
  })

  it('抽選結果は履歴に記録される(recordDraw 呼び出し)', () => {
    const app = mk()
    render(<LotteryScreen app={app} />)
    fireEvent.click(screen.getByRole('button', { name: 'まわす' }))
    expect(app.recordDraw).toHaveBeenCalledTimes(1)
    expect(app.recordDraw).toHaveBeenCalledWith([
      { filling: '鮭', seasoning: '塩' },
      { filling: '梅', seasoning: '醤油' },
      { filling: 'おかか', seasoning: '塩' },
      { filling: '昆布', seasoning: 'なし' },
      { filling: 'ツナマヨ', seasoning: 'ごま油' },
    ])
  })

  it('fillings 0件時は「まわす」disabled + 案内文言', () => {
    const app = mk({ state: { fillings: [], seasonings: ['塩'], history: [] } as any })
    render(<LotteryScreen app={app} />)
    const btn = screen.getByRole('button', { name: 'まわす' })
    expect(btn).toBeDisabled()
    expect(screen.getByText(/具を追加してください/)).toBeInTheDocument()
  })

  it('再抽選で結果が入れ替わる', async () => {
    const app = mk()
    const { drawSet } = await import('../domain/lottery')
    const mocked = vi.mocked(drawSet)
    render(<LotteryScreen app={app} />)
    fireEvent.click(screen.getByRole('button', { name: 'まわす' }))
    mocked.mockImplementationOnce(() => [
      { filling: '明太子', seasoning: '塩' },
      { filling: '明太子', seasoning: '塩' },
      { filling: '明太子', seasoning: '塩' },
      { filling: '明太子', seasoning: '塩' },
      { filling: '明太子', seasoning: '塩' },
    ])
    fireEvent.click(screen.getByRole('button', { name: 'まわす' }))
    expect(screen.getAllByRole('listitem')[0]).toHaveTextContent('明太子')
    expect(app.recordDraw).toHaveBeenCalledTimes(2)
  })
})
