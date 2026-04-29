import { Suspense, lazy, useState } from 'react'

import localforage from 'localforage'
import { FaBars, FaEllipsisVertical } from 'react-icons/fa6'

import logo from '../favicon.svg'
import { signOut } from '../firebase'
import AuthButton from './AuthButton'
import Button from './Button'
import styles from './Header.module.css'

import type { StoreModel } from '../store'

const ConfirmDialog = lazy(() => import('./ConfirmDialog'))
const AboutDialog = lazy(() => import('./AboutDialog'))
const SettingsDialog = lazy(() => import('./SettingsDialog'))

type DialogType = 'settings' | 'policy' | 'about' | null

export default function Header({
  model,
  onSidebarOpen,
}: {
  model: StoreModel
  onSidebarOpen: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [openDialog, setOpenDialog] = useState<DialogType>(null)

  return (
    <div className={styles.header}>
      <img src={logo} className={styles.headerLogo} />
      <h1 className={styles.headerTitle}>ytshuffle2</h1>
      <button
        className={styles.sidebarToggleMobile}
        onClick={() => {
          onSidebarOpen()
        }}
      >
        <FaBars size={18} /> Channels
      </button>
      <div className={styles.menuContainer}>
        <AuthButton model={model} />
        <div className={styles.menuWrapper}>
          <Button
            onClick={() => {
              setMenuOpen(o => !o)
            }}
          >
            <FaEllipsisVertical size={18} />
          </Button>
          {menuOpen ? (
            <>
              <div
                className={styles.dropdownBackdrop}
                onClick={() => {
                  setMenuOpen(false)
                }}
              />
              <div className={styles.dropdown}>
                <Button
                  onClick={() => {
                    setOpenDialog('settings')
                    setMenuOpen(false)
                  }}
                >
                  Settings
                </Button>
                <Button
                  onClick={() => {
                    setOpenDialog('about')
                    setMenuOpen(false)
                  }}
                >
                  About
                </Button>
                <Button
                  onClick={() => {
                    setOpenDialog('policy')
                    setMenuOpen(false)
                  }}
                >
                  Privacy policy
                </Button>
                <Button
                  onClick={() => {
                    void (async () => {
                      try {
                        await localforage.clear()
                        globalThis.location.reload()
                      } catch (error: unknown) {
                        console.error('clear cache failed', error)
                      }
                    })()
                  }}
                >
                  Clear local cache
                </Button>
                {model.uid ? (
                  <Button
                    onClick={() => {
                      void (async () => {
                        try {
                          await signOut()
                        } catch (error: unknown) {
                          console.error('signOut failed', error)
                          model.setError('Failed to sign out.')
                        }
                        setMenuOpen(false)
                      })()
                    }}
                  >
                    Sign out
                  </Button>
                ) : null}
              </div>
            </>
          ) : null}
        </div>
      </div>
      {openDialog === 'settings' && (
        <Suspense fallback={null}>
          <SettingsDialog
            open
            model={model}
            onClose={() => {
              setOpenDialog(null)
            }}
          />
        </Suspense>
      )}
      {openDialog === 'policy' && (
        <Suspense fallback={null}>
          <ConfirmDialog
            open
            onClose={() => {
              setOpenDialog(null)
            }}
          />
        </Suspense>
      )}
      {openDialog === 'about' && (
        <Suspense fallback={null}>
          <AboutDialog
            open
            onClose={() => {
              setOpenDialog(null)
            }}
          />
        </Suspense>
      )}
    </div>
  )
}
