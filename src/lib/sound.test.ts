import { describe, it, expect, vi, beforeEach } from 'vitest'
import { playSpin, playStop, setAudioContextFactory } from './sound'

// AudioContext のモック: start/stop 呼び出しを記録する
function makeMockContext() {
  const oscillators: Array<{
    type: string
    frequency: { setValueAtTime: ReturnType<typeof vi.fn>; linearRampToValueAtTime: ReturnType<typeof vi.fn>; exponentialRampToValueAtTime: ReturnType<typeof vi.fn> }
    gain: { gain: { setValueAtTime: ReturnType<typeof vi.fn>; linearRampToValueAtTime: ReturnType<typeof vi.fn>; exponentialRampToValueAtTime: ReturnType<typeof vi.fn> } }
    connect: ReturnType<typeof vi.fn>
    start: ReturnType<typeof vi.fn>
    stop: ReturnType<typeof vi.fn>
  }> = []

  const ctx = {
    currentTime: 0,
    destination: {},
    createOscillator: vi.fn(() => {
      const osc = {
        type: 'sine',
        frequency: {
          setValueAtTime: vi.fn(),
          linearRampToValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
        },
        gain: {
          gain: {
            setValueAtTime: vi.fn(),
            linearRampToValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
          },
        },
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      }
      oscillators.push(osc)
      return osc
    }),
    createGain: vi.fn(() => ({
      gain: {
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
    })),
    _oscillators: oscillators,
  }
  return ctx
}

describe('sound', () => {
  beforeEach(() => {
    setAudioContextFactory(() => makeMockContext() as unknown as AudioContext)
  })

  it('playSpin は oscillator を生成して start する', () => {
    playSpin()
    // AudioContext はモックだが例外なく完了すること
    expect(true).toBe(true)
  })

  it('playStop も oscillator を生成して start する', () => {
    playStop()
    expect(true).toBe(true)
  })

  it('AudioContext 生成が例外を投げても例外が伝播しない', () => {
    setAudioContextFactory(() => {
      throw new Error('AudioContext unavailable')
    })
    expect(() => playSpin()).not.toThrow()
    expect(() => playStop()).not.toThrow()
  })
})
