import { observer } from 'mobx-react-lite'
import { FaBackwardStep, FaForwardStep, FaStop } from 'react-icons/fa6'

import Button from './Button'
import styles from './PlayerControls.module.css'

import type { StoreModel } from '../store'

const PlayerControls = observer(function ({ model }: { model: StoreModel }) {
  return (
    <div className={styles.controls}>
      <Button
        onClick={() => {
          model.goToPrev()
        }}
        title="Previous"
      >
        <FaBackwardStep size={18} />
      </Button>
      <Button
        onClick={() => {
          model.goToNext()
        }}
        title="Next"
      >
        <FaForwardStep size={18} />
      </Button>
      <Button
        onClick={() => {
          model.setPlaying()
        }}
        title="Stop"
      >
        <FaStop size={18} />
      </Button>
    </div>
  )
})

export default PlayerControls
