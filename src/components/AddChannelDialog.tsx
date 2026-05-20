import { useState } from 'react'

import BaseDialog from './BaseDialog'
import { getItemKey } from '../fetch'
import { getVideoId } from '../util'
import styles from './AddChannelDialog.module.css'

function parseLines(text: string) {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .flatMap(url => {
      const parsed = getVideoId(url)
      return parsed ? [{ name: getItemKey(parsed), url }] : []
    })
}

export default function AddChannelDialog({
  onClose,
}: {
  onClose: (results?: { name: string; url: string }[]) => void
}) {
  const [text, setText] = useState('')

  const handleClose = () => {
    onClose()
  }

  return (
    <BaseDialog onClose={handleClose}>
      <form
        onSubmit={event => {
          event.preventDefault()
          const results = parseLines(text)
          if (results.length > 0) {
            onClose(results)
          }
        }}
      >
        <div className={styles.field}>
          <label htmlFor="channel-urls" className={styles.fieldLabel}>
            YouTube channel, playlist, or video URLs (one per line):
          </label>
          <textarea
            id="channel-urls"
            value={text}
            onChange={event => {
              setText(event.target.value)
            }}
            className={styles.textarea}
            autoFocus
          />
        </div>
        <div className={styles.actions}>
          <button type="submit">Add</button>
          <button
            type="button"
            onClick={() => {
              setText(t =>
                t
                  ? `${t}\nhttps://youtube.com/@VaporMemory`
                  : 'https://youtube.com/@VaporMemory',
              )
            }}
          >
            Example
          </button>
          <button
            type="button"
            onClick={() => {
              handleClose()
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    </BaseDialog>
  )
}
