import { FaX } from 'react-icons/fa6'

import styles from './BaseDialog.module.css'

export default function BaseDialog({
  onClose,
  children,
}: {
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <dialog
      ref={el => {
        if (el && !el.open) {
          el.showModal()
        }
      }}
      onClick={event => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <div>
        <button
          className={styles.dialogClose}
          onClick={() => {
            onClose()
          }}
        >
          <FaX />
        </button>
        {children}
      </div>
    </dialog>
  )
}
