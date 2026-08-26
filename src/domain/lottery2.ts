import { drawOne } from './lottery'

export interface LotteryResult2 {
  filling: string
  filling2: string
  seasoning: string
}

/**
 * 2具モード: 各組で2つの異なる具を抽選(重複なし)。
 * fillings が2件未満の場合は null。
 */
export function drawSetTwoFillings(
  fillings: string[],
  seasonings: string[],
  count = 5,
): LotteryResult2[] | null {
  if (fillings.length < 2) return null
  return Array.from({ length: count }, () => {
    const a = drawOne(fillings)!
    let b = drawOne(fillings)!
    while (b === a) b = drawOne(fillings)!
    return {
      filling: a,
      filling2: b,
      seasoning: seasonings.length > 0 ? drawOne(seasonings)! : '',
    }
  })
}
