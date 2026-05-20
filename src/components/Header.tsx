import { useState } from 'react'

import localforage from 'localforage'
import { FaBars, FaEllipsisVertical } from 'react-icons/fa6'

import logo from '../favicon.svg'
import { signOut } from '../firebase'
import AboutDialog from './AboutDialog'
import AuthButton from './AuthButton'
import ConfirmDialog from './ConfirmDialog'
import styles from './Header.module.css'
import SettingsDialog from './SettingsDialog'

import type { StoreModel } from '../store'

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

  const closeDialog = () => {
    setOpenDialog(null)
  }

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
          <button
            onClick={() => {
              setMenuOpen(o => !o)
            }}
          >
            <FaEllipsisVertical size={18} />
          </button>
          {menuOpen ? (
            <>
              <div
                className={styles.dropdownBackdrop}
                onClick={() => {
                  setMenuOpen(false)
                }}
              />
              <div className={styles.dropdown}>
                <button
                  onClick={() => {
                    setOpenDialog('settings')
                    setMenuOpen(false)
                  }}
                >
                  Settings
                </button>
                <button
                  onClick={() => {
                    setOpenDialog('about')
                    setMenuOpen(false)
                  }}
                >
                  About
                </button>
                <button
                  onClick={() => {
                    setOpenDialog('policy')
                    setMenuOpen(false)
                  }}
                >
                  Privacy policy
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false)
                    localforage.clear().then(
                      () => {
                        globalThis.location.reload()
                      },
                      (error: unknown) => {
                        console.error('clear cache failed', error)
                        model.setError('Failed to clear local cache.')
                      },
                    )
                  }}
                >
                  Clear local cache
                </button>
                {model.uid ? (
                  <button
                    onClick={() => {
                      setMenuOpen(false)
                      signOut().catch((error: unknown) => {
                        console.error('signOut failed', error)
                        model.setError('Failed to sign out.')
                      })
                    }}
                  >
                    Sign out
                  </button>
                ) : null}
              </div>
            </>
          ) : null}
        </div>
      </div>
      {openDialog === 'settings' && (
        <SettingsDialog
          model={model}
          onClose={() => {
            closeDialog()
          }}
        />
      )}
      {openDialog === 'policy' && (
        <ConfirmDialog
          onClose={() => {
            closeDialog()
          }}
        />
      )}
      {openDialog === 'about' && (
        <AboutDialog
          onClose={() => {
            closeDialog()
          }}
        />
      )}
    </div>
  )
}
