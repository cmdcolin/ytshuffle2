import { useState } from 'react'

import BaseDialog from './BaseDialog'
import styles from './EditPlaylistDialog.module.css'

export default function EditPlaylistDialog({
  initialName,
  initialChannels,
  availableChannels,
  onClose,
}: {
  initialName: string
  initialChannels: string[]
  availableChannels: string[]
  onClose: (result?: { name: string; channels: string[] }) => void
}) {
  const [name, setName] = useState(initialName)
  const [selected, setSelected] = useState(() => new Set(initialChannels))
  const isNew = initialName === ''

  const toggle = (channel: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(channel)) {
        next.delete(channel)
      } else {
        next.add(channel)
      }
      return next
    })
  }

  return (
    <BaseDialog onClose={onClose}>
      <form
        onSubmit={event => {
          event.preventDefault()
          if (name.trim()) {
            onClose({ name: name.trim(), channels: [...selected] })
          }
        }}
      >
        <div className={styles.field}>
          <label htmlFor="edit-playlist-name" className={styles.fieldLabel}>
            Playlist name
          </label>
          <input
            id="edit-playlist-name"
            type="text"
            value={name}
            onChange={event => {
              setName(event.target.value)
            }}
            className={styles.nameInput}
            autoFocus
          />
        </div>
        <div className={styles.field}>
          <div className={styles.sectionLabel}>Channels</div>
          {availableChannels.length === 0 ? (
            <div className={styles.empty}>No channels added yet</div>
          ) : (
            availableChannels.map(channel => (
              <label key={channel} className={styles.checkboxRow}>
                <input
                  type="checkbox"
                  checked={selected.has(channel)}
                  onChange={() => {
                    toggle(channel)
                  }}
                />
                {channel}
              </label>
            ))
          )}
        </div>
        <div className={styles.actions}>
          <button type="submit">{isNew ? 'Create' : 'Save'}</button>
          <button
            type="button"
            onClick={() => {
              onClose()
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    </BaseDialog>
  )
}
