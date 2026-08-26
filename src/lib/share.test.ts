import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildShareText, shareOrCopy } from './share'
import type { LotteryResult } from '../domain/lottery'
import type { LotteryResult2 } from '../domain/lottery2'

const one: LotteryResult[] = [
  { filling: '鮭', seasoning: '塩' },
  { filling: '梅', seasoning: '醤油' },
]

const two: LotteryResult2[] = [
  { filling: '鮭', filling2: '梅', seasoning: '塩' },
  { filling: '明太子', filling2: 'おかか', seasoning: 'ごま油' },
]

describe('buildShareText', () => {
  it('ヘッダーと番号付きリストを生成する(1具)', () => {
    const text = buildShareText(one)
    const lines = text.split('\n')
    expect(lines[0]).toContain('おにシミュ')
    expect(lines[1]).toBe('1. 鮭 × 塩')
    expect(lines[2]).toBe('2. 梅 × 醤油')
  })

  it('2具モードは「鮭 ×梅 × 塩」形式', () => {
    const text = buildShareText(two)
    expect(text).toContain('1. 鮭 ×梅 × 塩')
    expect(text).toContain('2. 明太子 ×おかか × ごま油')
  })

  it('味付けなしは — を表示', () => {
    const text = buildShareText([{ filling: '鮭', seasoning: '' }])
    expect(text).toContain('1. 鮭 × —')
  })
})

describe('shareOrCopy', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('navigator.share が使える場合は共有して shared を返す', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { share })
    const result = await shareOrCopy(one)
    expect(result).toBe('shared')
    expect(share).toHaveBeenCalledTimes(1)
    expect(share.mock.calls[0][0].text).toContain('鮭')
  })

  it('share 不可なら clipboard.writeText で copied を返す', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    const result = await shareOrCopy(one)
    expect(result).toBe('copied')
    expect(writeText).toHaveBeenCalledTimes(1)
    expect(writeText.mock.calls[0][0]).toContain('鮭')
  })

  it('両方失敗したら failed を返す(例外を投げない)', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('denied'))
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    const result = await shareOrCopy(one)
    expect(result).toBe('failed')
  })

  it('share が拒否されたら clipboard にフォールバック', async () => {
    const share = vi.fn().mockRejectedValue(new Error('abort'))
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { share, clipboard: { writeText } })
    const result = await shareOrCopy(one)
    expect(result).toBe('copied')
    expect(writeText).toHaveBeenCalledTimes(1)
  })
})
