import { FaX } from 'react-icons/fa6'

import { useDialogShown } from '../util'
import styles from './BaseDialog.module.css'

export default function BaseDialog({
  open,
  onClose,
  children,
}: {
  open: boolean
  onClose: () => void
  children: React.ReactNode
}) {
  const ref = useDialogShown(open)

  return (
    <dialog
      ref={ref}
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
