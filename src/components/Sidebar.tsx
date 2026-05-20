import { useState } from 'react'

import { observer } from 'mobx-react-lite'

import AddChannelDialog from './AddChannelDialog'
import EditPlaylistDialog from './EditPlaylistDialog'
import styles from './Sidebar.module.css'

import type { StoreModel } from '../store'

type EditModal = { originalName: string; channels: string[] } | null

function ChannelProgress({
  current,
  total,
}: {
  current: number
  total: number
}) {
  const percent = Math.round((current / total) * 100)
  const title = total > 0 ? `${current} / ${total}` : 'Loading…'
  return (
    <div className={styles.progressBar} title={title}>
      {total > 0 ? (
        <div className={styles.progressFill} style={{ width: `${percent}%` }} />
      ) : (
        <div className={styles.progressIndeterminate} />
      )}
    </div>
  )
}

function SidebarItem({
  name,
  active,
  onSelect,
  actions,
  footer,
}: {
  name: string
  active: boolean
  onSelect: () => void
  actions: React.ReactNode
  footer?: React.ReactNode
}) {
  return (
    <>
      <div className={`${styles.item}${active ? ` ${styles.itemActive}` : ''}`}>
        <button
          className={styles.itemName}
          onClick={() => {
            onSelect()
          }}
          title={name}
        >
          {name}
        </button>
        <div className={styles.itemActions}>{actions}</div>
      </div>
      {footer}
    </>
  )
}

const Sidebar = observer(function ({
  model,
  open,
  onClose,
}: {
  model: StoreModel
  open: boolean
  onClose: () => void
}) {
  const [editModal, setEditModal] = useState<EditModal>(null)
  const [showAddChannel, setShowAddChannel] = useState(false)
  const { playlists, channels, activePlaylistName } = model
  const channelNames = Object.keys(channels)

  const handleSavePlaylist = (result?: {
    name: string
    channels: string[]
  }) => {
    if (result) {
      model.savePlaylist(
        editModal?.originalName ?? '',
        result.name,
        result.channels,
      )
    }
    setEditModal(null)
  }

  const handleAddChannel = (results?: { name: string; url: string }[]) => {
    if (results) {
      for (const { name, url } of results) {
        model.addChannel(name, url)
      }
    }
    setShowAddChannel(false)
  }

  return (
    <div className={`${styles.sidebar}${open ? ` ${styles.sidebarOpen}` : ''}`}>
      <div className={styles.sidebarHeader}>
        <span className={styles.sidebarTitle}>Channels</span>
        <div className={styles.headerActions}>
          <button
            className={styles.sidebarNewInline}
            onClick={() => {
              setShowAddChannel(true)
            }}
            title="Add channel"
          >
            +
          </button>
          <button
            className={styles.sidebarCloseMobile}
            onClick={() => {
              onClose()
            }}
            title="Close"
          >
            ✕
          </button>
        </div>
      </div>
      <div>
        {channelNames.map(name => {
          const progress = model.channelProgress.get(name)
          return (
            <div key={name}>
              <SidebarItem
                name={name}
                active={name === model.selectedChannel}
                onSelect={() => {
                  model.setSelectedChannel(name)
                  onClose()
                }}
                actions={
                  <>
                    <button
                      className={styles.itemAction}
                      onClick={() => {
                        model.refreshChannel(name).catch((error: unknown) => {
                          console.error('refreshChannel failed', error)
                          model.setError(`Failed to refresh "${name}".`)
                        })
                      }}
                      title="Refresh"
                    >
                      ↻
                    </button>
                    <button
                      className={styles.itemAction}
                      onClick={() => {
                        model.removeChannel(name)
                      }}
                      title="Remove"
                    >
                      ✕
                    </button>
                  </>
                }
                footer={
                  progress ? (
                    <ChannelProgress
                      current={progress.current}
                      total={progress.total}
                    />
                  ) : null
                }
              />
            </div>
          )
        })}
      </div>
      <div className={styles.sectionDivider} />

      {model.uid && (
        <>
          <div className={styles.sidebarHeader}>
            <span className={styles.sidebarTitle}>Playlists</span>
            <button
              className={styles.sidebarNewInline}
              onClick={() => {
                setEditModal({ originalName: '', channels: [] })
              }}
              title="Add Playlists"
            >
              +
            </button>
          </div>
          <div>
            {Object.keys(playlists).map(name => (
              <div key={name}>
                <SidebarItem
                  name={name}
                  active={name === activePlaylistName}
                  onSelect={() => {
                    model.setPlaylist(name)
                    onClose()
                  }}
                  actions={
                    <>
                      <button
                        className={styles.itemAction}
                        onClick={() => {
                          const config = playlists[name]
                          if (config) {
                            setEditModal({
                              originalName: name,
                              channels: config.channels,
                            })
                          }
                        }}
                        title="Edit"
                      >
                        ✎
                      </button>
                      <button
                        className={styles.itemAction}
                        onClick={() => {
                          model.deletePlaylist(name)
                        }}
                        title="Delete"
                      >
                        ✕
                      </button>
                    </>
                  }
                />
              </div>
            ))}
          </div>
          <div className={styles.sectionDivider} />

          {editModal === null ? null : (
            <EditPlaylistDialog
              initialName={editModal.originalName}
              initialChannels={editModal.channels}
              availableChannels={channelNames}
              onClose={result => {
                handleSavePlaylist(result)
              }}
            />
          )}
        </>
      )}

      {showAddChannel ? (
        <AddChannelDialog
          onClose={results => {
            handleAddChannel(results)
          }}
        />
      ) : null}
    </div>
  )
})

export default Sidebar
