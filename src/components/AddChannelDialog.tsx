import { useState } from 'react'

import BaseDialog from './BaseDialog'
import Button from './Button'
import { getItemKey } from '../fetch'
import { getVideoId } from '../util'
import styles from './AddChannelDialog.module.css'

function deriveName(url: string) {
  const parsed = getVideoId(url.trim())
  return parsed ? getItemKey(parsed) : undefined
}

function parseLines(text: string) {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .flatMap(url => {
      const name = deriveName(url)
      return name ? [{ name, url }] : []
    })
}

export default function AddChannelDialog({
  open,
  onClose,
}: {
  open: boolean
  onClose: (results?: Array<{ name: string; url: string }>) => void
}) {
  const [text, setText] = useState('')

  const handleClose = () => {
    onClose()
  }

  return (
    <BaseDialog open={open} onClose={handleClose}>
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
          <Button type="submit">Add</Button>
          <Button
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
          </Button>
          <Button type="button" onClick={handleClose}>
            Cancel
          </Button>
        </div>
      </form>
    </BaseDialog>
  )
}
