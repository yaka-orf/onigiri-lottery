import '@testing-library/jest-dom/vitest'

// Node 26 + jsdom 環境で window.localStorage が Node 内部 webstorage の
// 遅延ゲッターになり undefined を返す問題へのポリフィル(テスト環境のみ)。
// Storage.prototype にメソッドを置くことで vi.spyOn(Storage.prototype, ...) も機能させる。
const g = globalThis as unknown as Record<string, any>
if (typeof g.localStorage?.setItem !== 'function') {
  const data = new Map<string, string>()
  const methods = {
    clear: () => {
      data.clear()
    },
    getItem: (k: string) => (data.has(k) ? data.get(k)! : null),
    key: (i: number) => Array.from(data.keys())[i] ?? null,
    removeItem: (k: string) => {
      data.delete(k)
    },
    setItem: (k: string, v: string) => {
      data.set(k, String(v))
    },
  }
  const proto = typeof g.Storage === 'function' ? g.Storage.prototype : {}
  Object.assign(proto, methods)
  const ls = Object.create(proto)
  Object.defineProperty(ls, 'length', {
    get: () => data.size,
    configurable: true,
  })
  Object.defineProperty(g, 'localStorage', {
    value: ls,
    configurable: true,
    writable: true,
  })
  if (g.window && g.window !== g.globalThis) {
    Object.defineProperty(g.window, 'localStorage', {
      value: ls,
      configurable: true,
      writable: true,
    })
  }
}
