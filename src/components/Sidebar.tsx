import { Suspense, lazy, useState } from 'react'

import { observer } from 'mobx-react-lite'

import styles from './Sidebar.module.css'

import type { StoreModel } from '../store'

const EditPlaylistDialog = lazy(() => import('./EditPlaylistDialog'))
const AddChannelDialog = lazy(() => import('./AddChannelDialog'))

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

function SidebarSection({
  title,
  onNew,
  items,
  renderItem,
}: {
  title: string
  onNew: () => void
  items: string[]
  renderItem: (name: string) => React.ReactNode
}) {
  return (
    <>
      <div className={styles.sidebarHeader}>
        <span className={styles.sidebarTitle}>{title}</span>
        <button
          className={styles.sidebarNewInline}
          onClick={onNew}
          title={`Add ${title}`}
        >
          +
        </button>
      </div>
      <div>
        {items.map(name => (
          <div key={name}>{renderItem(name)}</div>
        ))}
      </div>
      <div className={styles.sectionDivider} />
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

  const renderChannelItem = (name: string) => {
    const progress = model.channelProgress.get(name)
    const isActive =
      model.activePlaylistName === null &&
      model.selectedChannelNames.includes(name)
    return (
      <>
        <div
          className={`${styles.item}${isActive ? ` ${styles.itemActive}` : ''}`}
        >
          <button
            className={styles.itemName}
            onClick={() => {
              model.selectChannel(name)
              onClose()
            }}
            title={name}
          >
            {name}
          </button>
          <div className={styles.itemActions}>
            <button
              className={styles.itemAction}
              onClick={() => {
                void (async () => {
                  try {
                    await model.refreshChannel(name)
                  } catch (error: unknown) {
                    console.error('refreshChannel failed', error)
                    model.setError(`Failed to refresh "${name}".`)
                  }
                })()
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
          </div>
        </div>
        {progress && (
          <ChannelProgress current={progress.current} total={progress.total} />
        )}
      </>
    )
  }

  const renderPlaylistItem = (name: string) => (
    <div
      className={`${styles.item}${name === activePlaylistName ? ` ${styles.itemActive}` : ''}`}
    >
      <button
        className={styles.itemName}
        onClick={() => {
          model.setPlaylist(name)
          onClose()
        }}
        title={name}
      >
        {name}
      </button>
      <div className={styles.itemActions}>
        <button
          className={styles.itemAction}
          onClick={() => {
            const config = playlists[name]
            if (config) {
              setEditModal({ originalName: name, channels: config.channels })
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
      </div>
    </div>
  )

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
        {channelNames.map(name => (
          <div key={name}>{renderChannelItem(name)}</div>
        ))}
      </div>
      <div className={styles.sectionDivider} />

      <SidebarSection
        title="Playlists"
        onNew={() => {
          setEditModal({ originalName: '', channels: [] })
        }}
        items={Object.keys(playlists)}
        renderItem={renderPlaylistItem}
      />

      {editModal === null ? null : (
        <Suspense fallback={null}>
          <EditPlaylistDialog
            open
            initialName={editModal.originalName}
            initialChannels={editModal.channels}
            availableChannels={channelNames}
            onClose={handleSavePlaylist}
          />
        </Suspense>
      )}

      {showAddChannel ? (
        <Suspense fallback={null}>
          <AddChannelDialog open onClose={handleAddChannel} />
        </Suspense>
      ) : null}
    </div>
  )
})

export default Sidebar
