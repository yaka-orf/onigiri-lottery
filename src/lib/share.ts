import type { LotteryResult } from '../domain/lottery'
import type { LotteryResult2 } from '../domain/lottery2'

type Result = LotteryResult | LotteryResult2

const fillingLabel = (r: Result): string =>
  'filling2' in r ? `${r.filling} ×${r.filling2}` : r.filling

/** 抽選結果を共有用テキストに変換する */
export function buildShareText(results: Result[]): string {
  const lines = ['おにシミュ抽選結果']
  results.forEach((r, i) => {
    const seasoning = r.seasoning === '' ? '—' : r.seasoning
    lines.push(`${i + 1}. ${fillingLabel(r)} × ${seasoning}`)
  })
  return lines.join('\n')
}

export type ShareOutcome = 'shared' | 'copied' | 'failed'

/** navigator.share が使えれば共有シート、なければクリップボードコピーにフォールバック */
export async function shareOrCopy(results: Result[]): Promise<ShareOutcome> {
  const text = buildShareText(results)

  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ text })
      return 'shared'
    } catch {
      // ユーザーがキャンセルした場合もここに来る → クリップボードへフォールバックせず終了
      // ただし「共有自体が失敗」なのか「キャンセル」なのか区別できないため、
      // AbortError 以外はフォールバックする設計は複雑化する。シンプルにフォールバックする。
    }
  }

  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return 'copied'
    } catch {
      return 'failed'
    }
  }

  return 'failed'
}
