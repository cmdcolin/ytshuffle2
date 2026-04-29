import { useState } from 'react'

import { observer } from 'mobx-react-lite'

import Button from './Button'
import FilterPanel from './FilterPanel'
import Header from './Header'
import LibraryTable from './LibraryTable'
import PlayerControls from './PlayerControls'
import Sidebar from './Sidebar'
import YoutubePanel from './YoutubePanel'
import { createStore } from '../store'
import styles from './App.module.css'

import type { StoreModel } from '../store'

export default function App({ initialPlaylist }: { initialPlaylist: string }) {
  const [model] = useState(() => createStore({ playlist: initialPlaylist }))
  return <AppView model={model} />
}

const AppView = observer(function ({ model }: { model: StoreModel }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pendingNames = Object.keys(model.pendingUrlChannels)
  return (
    <div className={styles.appRoot}>
      <Header
        model={model}
        onSidebarOpen={() => {
          setSidebarOpen(true)
        }}
      />
      <div className={styles.appBody}>
        <Sidebar
          model={model}
          open={sidebarOpen}
          onClose={() => {
            setSidebarOpen(false)
          }}
        />
        <div className={styles.libraryColumn}>
          {pendingNames.length > 0 ? (
            <div className={styles.pendingBanner}>
              <span>Add {pendingNames.join(', ')} to your library?</span>
              <Button
                onClick={() => {
                  model.acceptPendingUrlChannels()
                }}
              >
                Add
              </Button>
              <Button
                onClick={() => {
                  model.dismissPendingUrlChannels()
                }}
              >
                Dismiss
              </Button>
            </div>
          ) : null}
          {model.videoFlat.length > 0 ? <FilterPanel model={model} /> : null}
          <LibraryTable model={model} />
        </div>
        <div className={styles.playerColumn}>
          <YoutubePanel model={model} />
          <PlayerControls model={model} />
        </div>
      </div>
    </div>
  )
})
