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

const App = observer(function App() {
  const [model] = useState(() => {
    const params = new URLSearchParams(globalThis.location.search)
    return createStore({ playlist: params.get('playlist') ?? '' })
  })
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

export default App
