import { useState } from 'react'
import { drawSet } from '../domain/lottery'
import { drawSetTwoFillings } from '../domain/lottery2'
import type { LotteryResult } from '../domain/lottery'
import type { LotteryResult2 } from '../domain/lottery2'
import type { UseAppState } from '../hooks/useAppState'

interface Props {
  app: UseAppState
}

type Mode = 'one' | 'two'
const MIN_COUNT = 1
const MAX_COUNT = 10

export function LotteryScreen({ app }: Props) {
  const [mode, setMode] = useState<Mode>('one')
  const [count, setCount] = useState(5)
  const [results, setResults] = useState<LotteryResult[] | LotteryResult2[] | null>(null)
  // 再抽選時もアニメーションを再生し直すため、抽選ごとにキーを変える
  const [spinCount, setSpinCount] = useState(0)

  const fillings = app.effectiveFillings
  const seasonings = app.effectiveSeasonings

  const needsTwo = mode === 'two'
  const canSpin = needsTwo ? fillings.length >= 2 : fillings.length > 0

  const spin = () => {
    if (!canSpin) return
    if (needsTwo) {
      const r = drawSetTwoFillings(fillings, seasonings, count)
      if (r === null) return
      setResults(r)
      setSpinCount((c) => c + 1)
      app.recordDraw(r as unknown as LotteryResult[])
    } else {
      const r = drawSet(fillings, seasonings, count)
      if (r === null) return
      setResults(r)
      setSpinCount((c) => c + 1)
      app.recordDraw(r)
    }
  }

  const isTwo = (r: LotteryResult | LotteryResult2): r is LotteryResult2 =>
    'filling2' in r

  return (
    <div className="lottery-screen">
      <fieldset className="mode-toggle">
        <legend className="visually-hidden">具の数</legend>
        <label>
          <input
            type="radio"
            name="filling-mode"
            value="one"
            checked={mode === 'one'}
            onChange={() => setMode('one')}
          />
          <span>具1つ</span>
        </label>
        <label>
          <input
            type="radio"
            name="filling-mode"
            value="two"
            checked={mode === 'two'}
            onChange={() => setMode('two')}
          />
          <span>具2つ</span>
        </label>
      </fieldset>

      <div className="count-stepper" role="group" aria-label="抽選個数">
        <button
          type="button"
          className="step-btn"
          onClick={() => setCount((c) => Math.max(MIN_COUNT, c - 1))}
          disabled={count <= MIN_COUNT}
          aria-label="個数を減らす"
        >
          −
        </button>
        <span className="count-value">
          <span className="count-num">{count}</span>
          <span className="count-unit">個</span>
        </span>
        <button
          type="button"
          className="step-btn"
          onClick={() => setCount((c) => Math.min(MAX_COUNT, c + 1))}
          disabled={count >= MAX_COUNT}
          aria-label="個数を増やす"
        >
          ＋
        </button>
      </div>

      {!canSpin && fillings.length === 0 && (
        <p className="notice" role="alert">
          抽選できる具がありません(リストタブで除外を解除するか追加してください)
        </p>
      )}
      {!canSpin && fillings.length === 1 && needsTwo && (
        <p className="notice" role="alert">
          具2つモードには具を2つ以上有効にしてください
        </p>
      )}
      <button
        type="button"
        className="spin-button"
        onClick={spin}
        disabled={!canSpin}
      >
        おにる！
      </button>
      {results && (
        <ol className="results" aria-label="抽選結果" key={spinCount}>
          {results.map((r, i) => (
            <li key={i} className="result-item">
              <span className="result-index">{i + 1}</span>
              <span className="result-filling">
                {isTwo(r) ? `${r.filling} ×${r.filling2}` : r.filling}
              </span>
              <span className="result-seasoning">
                {r.seasoning === '' ? '—' : r.seasoning}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
