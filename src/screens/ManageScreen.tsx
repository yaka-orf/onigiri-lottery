import { useState, useRef } from 'react'
import type { UseAppState } from '../hooks/useAppState'
import { CATEGORIES, CATEGORY_LABELS, type Category } from '../domain/model'

interface Props {
  app: UseAppState
}

type Kind = 'fillings' | 'seasonings'

export function ManageScreen({ app }: Props) {
  const [kind, setKind] = useState<Kind>('fillings')
  const [input, setInput] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  // ドラッグ&ドロップ並べ替え状態
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)
  const dragCounter = useRef(0)

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

  // --- ドラッグ&ドロップ並べ替え ---
  const move = (from: number, to: number) => {
    if (isFillings) app.moveFilling(from, to)
    else app.moveSeasoning(from, to)
  }

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDragIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index))
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setOverIndex(index)
  }

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (dragIndex !== null && dragIndex !== index) {
      move(dragIndex, index)
    }
    setDragIndex(null)
    setOverIndex(null)
  }

  const handleDragEnd = () => {
    setDragIndex(null)
    setOverIndex(null)
    dragCounter.current = 0
  }

  // --- タッチ/ポインター並べ替え(iOS Safari は HTML5 DnD 非対応のため) ---
  const [touchDrag, setTouchDrag] = useState<{
    from: number
    currentIndex: number
    y: number
  } | null>(null)
  const rowHeightRef = useRef(0)
  const listRef = useRef<HTMLUListElement>(null)

  const startTouchDrag = (from: number, y: number) => {
    const row = listRef.current?.children[from] as HTMLElement | undefined
    rowHeightRef.current = row ? row.offsetHeight : 48
    setTouchDrag({ from, currentIndex: from, y })
  }

  const moveTouchDrag = (y: number) => {
    setTouchDrag((d) => {
      if (!d) return d
      const delta = Math.round((y - d.y) / rowHeightRef.current)
      const next = Math.max(
        0,
        Math.min(list.length - 1, d.from + delta),
      )
      return { ...d, currentIndex: next }
    })
  }

  const endTouchDrag = () => {
    setTouchDrag((d) => {
      if (d && d.currentIndex !== d.from) {
        move(d.from, d.currentIndex)
      }
      return null
    })
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

      <ul className="item-list" ref={listRef}>
        {list.map((name, index) => {
          const isExcluded = excluded.includes(name)
          const isDragging = dragIndex === index || touchDrag?.from === index
          const isOver = overIndex === index && dragIndex !== null && dragIndex !== index
          const isTouchTarget = touchDrag?.currentIndex === index && touchDrag.from !== index
          return (
            <li
              key={name}
              className={`item-row${isExcluded ? ' excluded' : ''}${isDragging ? ' dragging' : ''}${isOver || isTouchTarget ? ' drag-over' : ''}`}
              draggable={!isExcluded}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
            >
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
                  <button
                    type="button"
                    className="drag-handle"
                    aria-label={`${name}を並べ替え`}
                    onPointerDown={(e) => {
                      if (isExcluded || e.pointerType === 'mouse') return
                      startTouchDrag(index, e.clientY)
                    }}
                    onPointerMove={(e) => {
                      if (touchDrag?.from === index && e.pointerType !== 'mouse') {
                        moveTouchDrag(e.clientY)
                      }
                    }}
                    onPointerUp={endTouchDrag}
                    onPointerCancel={endTouchDrag}
                    onClick={() => {
                      // マウス用フォールバック(クリックでは何もしない)
                    }}
                  >
                    ☰
                  </button>
                  <span className="item-name">{name}</span>
                  {isFillings && (
                    <select
                      className="category-select"
                      value={app.state.fillingCategories[name] ?? 'other'}
                      onChange={(e) =>
                        app.setFillingCategory(
                          name,
                          e.target.value as Category,
                        )
                      }
                      aria-label={`${name}のカテゴリ`}
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {CATEGORY_LABELS[c]}
                        </option>
                      ))}
                    </select>
                  )}
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
