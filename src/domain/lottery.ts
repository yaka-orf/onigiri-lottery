export interface LotteryResult {
  filling: string
  seasoning: string
}

export function drawOne(items: string[]): string | null {
  if (items.length === 0) return null
  return items[Math.floor(Math.random() * items.length)]
}

export function drawSet(
  fillings: string[],
  seasonings: string[],
  count = 5,
): LotteryResult[] | null {
  if (fillings.length === 0) return null
  return Array.from({ length: count }, () => ({
    filling: drawOne(fillings)!,
    seasoning: seasonings.length > 0 ? drawOne(seasonings)! : '',
  }))
}
