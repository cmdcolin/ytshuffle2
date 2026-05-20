import { observer } from 'mobx-react-lite'

import BaseDialog from './BaseDialog'
import Checkbox from './Checkbox'
import styles from './SettingsDialog.module.css'

import type { StoreModel } from '../store'

const SettingsDialog = observer(function ({
  onClose,
  model,
}: {
  onClose: () => void
  model: StoreModel
}) {
  return (
    <BaseDialog onClose={onClose}>
      <h2 className={styles.title}>Settings</h2>
      <Checkbox
        id="settings_shuffle"
        label="Shuffle"
        checked={model.shuffle}
        onChange={event => {
          model.setShuffle(event.target.checked)
        }}
      />
      <Checkbox
        id="settings_follow_playing"
        label="Follow playing"
        checked={model.follow}
        onChange={event => {
          model.setFollow(event.target.checked)
        }}
      />
      <Checkbox
        id="settings_autoplay"
        label="Auto-advance"
        checked={model.autoplay}
        onChange={event => {
          model.setAutoplay(event.target.checked)
        }}
      />
    </BaseDialog>
  )
})

export default SettingsDialog
