import { useState } from 'react'

import { observer } from 'mobx-react-lite'

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
