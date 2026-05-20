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
      <button
        onClick={() => {
          signInWithGoogle().catch((error: unknown) => {
            console.error('signInWithGoogle failed', error)
          })
        }}
      >
        Sign in
      </button>
    )
  }

  if (photoURL) {
    return (
      <img
        src={photoURL}
        alt={displayName ?? ''}
        title={displayName ?? ''}
        className={styles.authAvatar}
      />
    )
  }

  return null
})
