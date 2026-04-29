import { observer } from 'mobx-react-lite'

import { signInWithGoogle } from '../firebase'
import styles from './AuthButton.module.css'
import Button from './Button'

import type { StoreModel } from '../store'

export default observer(function AuthButton({ model }: { model: StoreModel }) {
  const { uid, displayName, photoURL, authLoading } = model

  if (authLoading) {
    return null
  }

  if (!uid) {
    return (
      <Button
        onClick={() => {
          void (async () => {
            try {
              await signInWithGoogle()
            } catch (error: unknown) {
              console.error('signInWithGoogle failed', error)
            }
          })()
        }}
      >
        Sign in
      </Button>
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
