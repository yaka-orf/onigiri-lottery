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
    excludedFillings: [],
    excludedSeasonings: [],
    settings: { mode: 'one', count: 5 },
    soundEnabled: false,
    tags: [
      { id: 'meat', label: '肉' },
      { id: 'fish', label: '魚介' },
      { id: 'classic', label: '定番' },
      { id: 'other', label: 'その他' },
    ],
    fillingCategories: { 鮭: 'fish', 梅: 'classic', おかか: 'classic' },
    history: [],
  },
  effectiveFillings: ['鮭', '梅', 'おかか'],
  effectiveSeasonings: ['塩', '醤油'],
  storageAvailable: true,
  addFilling: vi.fn(),
  removeFilling: vi.fn(),
  updateFilling: vi.fn(),
  toggleExcludeFilling: vi.fn(() => true),
  addSeasoning: vi.fn(),
  removeSeasoning: vi.fn(),
  updateSeasoning: vi.fn(),
  toggleExcludeSeasoning: vi.fn(() => true),
  setLotteryMode: vi.fn(),
  setLotteryCount: vi.fn(),
  toggleSound: vi.fn(),
  setFillingCategory: vi.fn(),
  addTag: vi.fn(() => true),
  renameTag: vi.fn(() => true),
  removeTag: vi.fn(() => true),
  recordDraw: vi.fn(),
  toggleFavorite: vi.fn(),
  clearHistory: vi.fn(),
  ...overrides,
} as unknown as UseAppState)

const findSpin = () => screen.getByRole('button', { name: 'ランダムでおにる！' })

describe('LotteryScreen', () => {
  beforeEach(() => vi.clearAllMocks())

  it('「ランダムでおにる！」押下で5組が番号付きで表示される', () => {
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
    const app = mk({
      state: { fillings: [], seasonings: ['塩'], settings: { mode: 'one', count: 5 }, history: [], tags: [], fillingCategories: {} } as any,
      effectiveFillings: [],
    })
    render(<LotteryScreen app={app} />)
    expect(findSpin()).toBeDisabled()
    expect(screen.getByText(/抽選できる具がありません/)).toBeInTheDocument()
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
    const list1 = screen.getByRole('list', { name: '作成結果' })
    fireEvent.click(findSpin())
    const list2 = screen.getByRole('list', { name: '作成結果' })
    expect(list1).not.toBe(list2)
  })

  describe('モード切替', () => {
    // setLotteryMode mock が state へ反映されるよう設定
    const mkWithModeSwitch = () => {
      const app = mk()
      ;(app.setLotteryMode as ReturnType<typeof vi.fn>).mockImplementation(
        (mode: 'one' | 'two') => {
          app.state.settings = { ...app.state.settings, mode }
        },
      )
      return app
    }

    it('初期は1具モード。2具モードへ切替できる', () => {
      const app = mkWithModeSwitch()
      render(<LotteryScreen app={app} />)
      const two = screen.getByLabelText('具の数')
      expect(two).toHaveValue('one')
      fireEvent.change(two, { target: { value: 'two' } })
      expect(app.setLotteryMode).toHaveBeenCalledWith('two')
    })

    it('2具モードで抽選すると2つの具が「×」区切りで表示され recordDraw も2具で呼ばれる', () => {
      // settings が two の state で直接描画して検証
      const app = mk({
        state: { fillings: ['鮭', '梅', 'おかか'], seasonings: ['塩', '醤油'], settings: { mode: 'two', count: 5 }, history: [], tags: [], fillingCategories: {} } as any,
      })
      render(<LotteryScreen app={app} />)
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
      const app = mk({
        state: { fillings: ['鮭'], seasonings: ['塩'], settings: { mode: 'two', count: 5 }, history: [], tags: [], fillingCategories: {} } as any,
        effectiveFillings: ['鮭'],
      })
      render(<LotteryScreen app={app} />)
      expect(findSpin()).toBeDisabled()
      expect(screen.getByText(/具2つモードには具を2つ以上/)).toBeInTheDocument()
    })
  })

  describe('自分でおにる(手動モード)', () => {
    it('「自分」ラジオで手動選択行が表示される', () => {
      render(<LotteryScreen app={mk()} />)
      fireEvent.change(screen.getByLabelText('作成方法'), { target: { value: 'manual' } })
      // count=5 → 5行
      const selects = screen.getAllByRole('combobox')
      expect(selects.length).toBe(12) // 切替セレクト2 + 各行 具+味付け の2×5行
    })

    it('デフォルト選択済みのまま「自分でおにる」で recordDraw される', () => {
      const app = mk()
      render(<LotteryScreen app={app} />)
      fireEvent.change(screen.getByLabelText('作成方法'), { target: { value: 'manual' } })
      fireEvent.click(screen.getByRole('button', { name: '保存' }))
      expect(app.recordDraw).toHaveBeenCalledTimes(1)
      expect(app.recordDraw).toHaveBeenCalledWith([
        { filling: '鮭', seasoning: '塩' },
        { filling: '鮭', seasoning: '塩' },
        { filling: '鮭', seasoning: '塩' },
        { filling: '鮭', seasoning: '塩' },
        { filling: '鮭', seasoning: '塩' },
      ])
    })

    it('未選択の具があるとエラー表示され recordDraw されない', () => {
      const app = mk()
      render(<LotteryScreen app={app} />)
      fireEvent.change(screen.getByLabelText('作成方法'), { target: { value: 'manual' } })
      // 1行目の具を未選択に
      fireEvent.change(screen.getAllByRole('combobox')[2], { target: { value: '' } })
      fireEvent.click(screen.getByRole('button', { name: '保存' }))
      expect(app.recordDraw).not.toHaveBeenCalled()
      expect(screen.getByRole('alert')).toHaveTextContent('選択してください')
    })

    it('ランダム結果の「編集」で手動モードに引き継がれる', () => {
      const app = mk()
      render(<LotteryScreen app={app} />)
      fireEvent.click(findSpin())
      fireEvent.click(screen.getByRole('button', { name: '編集' }))
      // 手動モードに切り替わり、セレクトに結果が反映済み
      expect(screen.getByLabelText('作成方法')).toHaveValue('manual')
      const selects = screen.getAllByRole('combobox')
      expect(selects.length).toBeGreaterThan(0)
    })
  })
})
