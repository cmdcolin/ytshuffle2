import { observer } from 'mobx-react-lite'

import { signInWithGoogle } from '../firebase'
import styles from './AuthButton.module.css'

import type { StoreModel } from '../store'

export default observer(function AuthButton({ model }: { model: StoreModel }) {
  const { uid, displayName, photoURL, authLoading } = model

  if (authLoading) {
    return null
  }

  if (!uid) {
    return (
      <div className={styles.authGroup}>
        <span
          className={styles.modeBadge}
          title="Library is saved on this device only"
        >
          Local
        </span>
        <button
          onClick={() => {
            signInWithGoogle().catch((error: unknown) => {
              console.error('signInWithGoogle failed', error)
            })
          }}
        >
          Sign in to sync
        </button>
      </div>
    )
  }

  return (
    <div className={styles.authGroup}>
      <span
        className={`${styles.modeBadge} ${styles.modeBadgeSynced}`}
        title={`Library synced to cloud${displayName ? ` as ${displayName}` : ''}`}
      >
        Synced
      </span>
      {photoURL ? (
        <img
          src={photoURL}
          alt={displayName ?? ''}
          title={displayName ?? ''}
          className={styles.authAvatar}
        />
      ) : null}
    </div>
  )
})
