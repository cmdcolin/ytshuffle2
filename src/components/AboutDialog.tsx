import BaseDialog from './BaseDialog'
import { version } from '../../package.json'
import logo from '../favicon.svg'
import styles from './AboutDialog.module.css'

export default function AboutDialog({ onClose }: { onClose: () => void }) {
  return (
    <BaseDialog onClose={onClose}>
      <div className={styles.dialogHeader}>
        <img src={logo} />
        <h2>ytshuffle {version}</h2>
      </div>
      <p>
        Source code/contact/report issues:{' '}
        <a href="https://github.com/cmdcolin/ytshuffle">GitHub</a>
      </p>
    </BaseDialog>
  )
}
