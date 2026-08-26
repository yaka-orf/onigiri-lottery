import { useState } from 'react'
import type { UseAppState } from '../hooks/useAppState'

interface Props {
  app: UseAppState
}

type Kind = 'fillings' | 'seasonings'

export function ManageScreen({ app }: Props) {
  const [kind, setKind] = useState<Kind>('fillings')
  const [input, setInput] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  const list = app.state[kind]
  const excluded =
    kind === 'fillings' ? app.state.excludedFillings : app.state.excludedSeasonings
  const isFillings = kind === 'fillings'

  const add = () => {
    const name = input.trim()
    if (!name) return
    const ok = isFillings ? app.addFilling(name) : app.addSeasoning(name)
    if (ok) setInput('')
  }

  const remove = (name: string) => {
    const msg = isFillings
      ? `「${name}」を具リストから削除しますか?`
      : `「${name}」を味付けリストから削除しますか?`
    if (!window.confirm(msg)) return
    if (isFillings) app.removeFilling(name)
    else app.removeSeasoning(name)
  }

  const startEdit = (name: string) => {
    setEditing(name)
    setEditValue(name)
  }

  const saveEdit = () => {
    if (editing === null) return
    const newName = editValue.trim()
    if (!newName || newName === editing) {
      setEditing(null)
      return
    }
    const ok = isFillings
      ? app.updateFilling(editing, newName)
      : app.updateSeasoning(editing, newName)
    if (ok) setEditing(null)
  }

  const toggleExclude = (name: string) => {
    if (isFillings) app.toggleExcludeFilling(name)
    else app.toggleExcludeSeasoning(name)
  }

  return (
    <div className="manage-screen">
      <div className="segment" role="tablist" aria-label="リスト種別">
        <button
          type="button"
          role="tab"
          aria-selected={isFillings}
          className={isFillings ? 'active' : ''}
          onClick={() => setKind('fillings')}
        >
          具
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={!isFillings}
          className={!isFillings ? 'active' : ''}
          onClick={() => setKind('seasonings')}
        >
          味付け
        </button>
      </div>

      <div className="sound-toggle-row">
        <button
          type="button"
          className={`sound-toggle${app.state.soundEnabled ? '' : ' muted'}`}
          onClick={app.toggleSound}
          aria-pressed={!app.state.soundEnabled}
          aria-label={app.state.soundEnabled ? 'サウンドをオフにする' : 'サウンドをオンにする'}
        >
          {app.state.soundEnabled ? '🔊 サウンド ON' : '🔇 サウンド OFF'}
        </button>
      </div>

      <p className="exclude-hint">「除外」をタップすると抽選対象から外れます(リストには残ります)</p>

      <ul className="item-list">
        {list.map((name) => {
          const isExcluded = excluded.includes(name)
          return (
            <li key={name} className={`item-row${isExcluded ? ' excluded' : ''}`}>
              {editing === name ? (
                <>
                  <input
                    className="edit-input"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    aria-label={`${name}を編集`}
                  />
                  <button type="button" onClick={saveEdit}>
                    保存
                  </button>
                  <button type="button" onClick={() => setEditing(null)}>
                    キャンセル
                  </button>
                </>
              ) : (
                <>
                  <span className="item-name">{name}</span>
                  <button
                    type="button"
                    className="exclude-btn"
                    onClick={() => toggleExclude(name)}
                    aria-pressed={isExcluded}
                  >
                    {isExcluded ? '解除' : '除外'}
                  </button>
                  <button type="button" onClick={() => startEdit(name)}>
                    編集
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(name)}
                    disabled={isFillings && list.length <= 1}
                  >
                    削除
                  </button>
                </>
              )}
            </li>
          )
        })}
      </ul>

      <div className="add-row">
        <input
          className="add-input"
          placeholder={isFillings ? '新しい具を追加' : '新しい味付けを追加'}
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button type="button" onClick={add}>
          追加
        </button>
      </div>
    </div>
  )
}
