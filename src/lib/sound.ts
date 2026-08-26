// Web Audio API 合成音ユーティリティ
// ファイル不要・軽量。iOS Safari 制約対応で AudioContext は
// 初回ユーザー操作時(関数呼び出し時)に遅延生成する。

type AudioContextCtor = typeof AudioContext

let audioContext: AudioContext | null = null
let failed = false

/** テスト/環境差し込み用ファクトリ(未指定なら環境の AudioContext を使う) */
let audioContextFactory: (() => AudioContext) | null = null

export function setAudioContextFactory(factory: (() => AudioContext) | null): void {
  audioContextFactory = factory
  audioContext = null
  failed = false
}

function getAudioContext(): AudioContext | null {
  if (failed) return null
  if (audioContext) return audioContext
  try {
    const ctor: AudioContextCtor | undefined =
      audioContextFactory
        ? undefined // ファクトリ優先
        : (globalThis as Record<string, unknown>).AudioContext as
            | AudioContextCtor
            | undefined
    audioContext = audioContextFactory
      ? audioContextFactory()
      : ctor
        ? new ctor()
        : null
    if (!audioContext) failed = true
    return audioContext
  } catch {
    failed = true
    return null
  }
}

interface ToneOptions {
  type: OscillatorType
  fromFreq: number
  toFreq: number
  duration: number
  volume: number
}

function playTone({ type, fromFreq, toFreq, duration, volume }: ToneOptions): void {
  const ctx = getAudioContext()
  if (!ctx) return

  try {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    const t = ctx.currentTime

    osc.type = type
    osc.frequency.setValueAtTime(fromFreq, t)
    osc.frequency.linearRampToValueAtTime(toFreq, t + duration)

    // フェードイン/アウトでポップノイズを防止
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.linearRampToValueAtTime(volume, t + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration)

    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(t)
    osc.stop(t + duration)
  } catch {
    // 再生失敗は無音で代替(アプリ動作に影響させない)
  }
}

/** 抽選開始音: 上昇ポンッ(sine 440→880Hz, 0.1s) */
export function playSpin(): void {
  playTone({
    type: 'sine',
    fromFreq: 440,
    toFreq: 880,
    duration: 0.1,
    volume: 0.15,
  })
}

/** 結果確定音: カチッ(square 短音, 0.05s) */
export function playStop(): void {
  playTone({
    type: 'square',
    fromFreq: 880,
    toFreq: 880,
    duration: 0.05,
    volume: 0.12,
  })
}
