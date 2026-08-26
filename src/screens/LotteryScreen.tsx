import { useState } from 'react'
import { drawSet } from '../domain/lottery'
import { drawSetTwoFillings } from '../domain/lottery2'
import type { LotteryResult } from '../domain/lottery'
import type { LotteryResult2 } from '../domain/lottery2'
import type { UseAppState } from '../hooks/useAppState'
import { shareOrCopy } from '../lib/share'
import { playSpin, playStop } from '../lib/sound'
import {
  CATEGORIES,
  CATEGORY_LABELS,
  type Category,
} from '../domain/model'

interface Props {
  app: UseAppState
}

const MIN_COUNT = 1
const MAX_COUNT = 10

type CategoryFilter = 'all' | Category

export function LotteryScreen({ app }: Props) {
  // モード・個数は AppState.settings から(永続化される)
  const mode = app.state.settings.mode
  const count = app.state.settings.count
  const [results, setResults] = useState<LotteryResult[] | LotteryResult2[] | null>(null)
  // 再抽選時もアニメーションを再生し直すため、抽選ごとにキーを変える
  const [spinCount, setSpinCount] = useState(0)
  // 共有ボタンのフィードバック表示
  const [shareState, setShareState] = useState<'idle' | 'done'>('idle')

  const fillings = app.effectiveFillings
  const seasonings = app.effectiveSeasonings
  const soundEnabled = app.state.soundEnabled
  const categories = app.state.fillingCategories

  // カテゴリ絞り込み('all'=全カテゴリ)
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all')
  const filteredFillings =
    categoryFilter === 'all'
      ? fillings
      : fillings.filter((f) => (categories[f] ?? 'other') === categoryFilter)

  const needsTwo = mode === 'two'
  const canSpin = needsTwo ? filteredFillings.length >= 2 : filteredFillings.length > 0

  const spin = () => {
    if (!canSpin) return
    if (soundEnabled) playSpin()
    if (needsTwo) {
      const r = drawSetTwoFillings(filteredFillings, seasonings, count)
      if (r === null) return
      setResults(r)
      setSpinCount((c) => c + 1)
      app.recordDraw(r as unknown as LotteryResult[])
    } else {
      const r = drawSet(filteredFillings, seasonings, count)
      if (r === null) return
      setResults(r)
      setSpinCount((c) => c + 1)
      app.recordDraw(r)
    }
    if (soundEnabled) {
      // 結果アニメーションの開始に合わせて確定音
      window.setTimeout(() => playStop(), 300)
    }
  }

  const handleShare = async () => {
    if (!results) return
    const outcome = await shareOrCopy(results)
    if (outcome !== 'failed') {
      setShareState('done')
      window.setTimeout(() => setShareState('idle'), 1500)
    }
  }

  const isTwo = (r: LotteryResult | LotteryResult2): r is LotteryResult2 =>
    'filling2' in r

  return (
    <div className="lottery-screen">
      <div className="category-chips" role="group" aria-label="カテゴリ絞り込み">
        <button
          type="button"
          className={`chip${categoryFilter === 'all' ? ' active' : ''}`}
          onClick={() => setCategoryFilter('all')}
          aria-pressed={categoryFilter === 'all'}
        >
          全部
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            className={`chip${categoryFilter === c ? ' active' : ''}`}
            onClick={() => setCategoryFilter(c)}
            aria-pressed={categoryFilter === c}
          >
            {CATEGORY_LABELS[c]}
          </button>
        ))}
      </div>

      <fieldset className="mode-toggle">
        <legend className="visually-hidden">具の数</legend>
        <label>
          <input
            type="radio"
            name="filling-mode"
            value="one"
            checked={mode === 'one'}
            onChange={() => app.setLotteryMode('one')}
          />
          <span>具1つ</span>
        </label>
        <label>
          <input
            type="radio"
            name="filling-mode"
            value="two"
            checked={mode === 'two'}
            onChange={() => app.setLotteryMode('two')}
          />
          <span>具2つ</span>
        </label>
      </fieldset>

      <div className="count-stepper" role="group" aria-label="抽選個数">
        <button
          type="button"
          className="step-btn"
          onClick={() => app.setLotteryCount(Math.max(MIN_COUNT, count - 1))}
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
          onClick={() => app.setLotteryCount(Math.min(MAX_COUNT, count + 1))}
          disabled={count >= MAX_COUNT}
          aria-label="個数を増やす"
        >
          ＋
        </button>
      </div>

      {!canSpin && filteredFillings.length === 0 && (
        <p className="notice" role="alert">
          抽選できる具がありません(リストタブで除外を解除するか追加してください)
        </p>
      )}
      {!canSpin && filteredFillings.length < 2 && needsTwo && filteredFillings.length > 0 && (
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
        <div className="results-wrap">
          <ol className="results" aria-label="抽選結果" key={spinCount}>
            {results.map((r, i) => (
              <li
                key={i}
                className="result-item"
                style={{ animationDelay: `${0.03 + i * 0.06}s` }}
              >
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
          <button
            type="button"
            className="share-button"
            onClick={handleShare}
          >
            {shareState === 'done' ? 'コピーしました' : '結果を共有'}
          </button>
        </div>
      )}
    </div>
  )
}
