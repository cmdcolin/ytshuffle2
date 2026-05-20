import { Suspense, lazy } from 'react'

import { observer } from 'mobx-react-lite'

import styles from './YoutubePanel.module.css'

import type { StoreModel } from '../store'

const YouTube = lazy(() => import('react-youtube'))

const options = {
  width: '100%',
  height: '100%',
  playerVars: {
    autoplay: 1 as const,
  },
}

const YoutubePanel = observer(function ({ model }: { model: StoreModel }) {
  const { playing, autoplay } = model
  return playing ? (
    <Suspense fallback={<div className={styles.videoPlaceholder} />}>
      <YouTube
        videoId={playing}
        opts={options}
        className={styles.videoFrame}
        onEnd={() => {
          if (autoplay) {
            model.goToNext()
          }
        }}
      />
    </Suspense>
  ) : (
    <div className={styles.videoPlaceholder}>
      <p>Nothing playing</p>
    </div>
  )
})
export default YoutubePanel
