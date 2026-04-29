import type { ChangeEvent } from 'react'

import styles from './Checkbox.module.css'

export default function Checkbox({
  id,
  checked,
  onChange,
  label,
}: {
  id: string
  checked: boolean
  label: string
  onChange: (event: ChangeEvent<HTMLInputElement>) => void
}) {
  return (
    <div className={styles.row}>
      <label htmlFor={id} className={styles.label}>
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className={styles.input}
        />
        {label}
      </label>
    </div>
  )
}
