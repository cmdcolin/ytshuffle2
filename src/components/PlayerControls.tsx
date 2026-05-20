import { observer } from 'mobx-react-lite'
import { FaBackwardStep, FaForwardStep, FaStop } from 'react-icons/fa6'

import styles from './PlayerControls.module.css'

import type { StoreModel } from '../store'

const PlayerControls = observer(function ({ model }: { model: StoreModel }) {
  return (
    <div className={styles.controls}>
      <button
        onClick={() => {
          model.goToPrev()
        }}
        title="Previous"
      >
        <FaBackwardStep size={18} />
      </button>
      <button
        onClick={() => {
          model.goToNext()
        }}
        title="Next"
      >
        <FaForwardStep size={18} />
      </button>
      <button
        onClick={() => {
          model.setPlaying()
        }}
        title="Stop"
      >
        <FaStop size={18} />
      </button>
    </div>
  )
})

export default PlayerControls
