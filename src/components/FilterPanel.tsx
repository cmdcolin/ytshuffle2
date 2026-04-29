import { observer } from 'mobx-react-lite'

import Button from './Button'
import styles from './FilterPanel.module.css'

import type { StoreModel } from '../store'

const FilterPanel = observer(function ({ model }: { model: StoreModel }) {
  return (
    <div className={styles.controls}>
      <label htmlFor="filter">Search:</label>
      <input
        id="filter"
        type="text"
        value={model.filter}
        onChange={event => {
          model.setFilter(event.target.value)
        }}
      />
      <Button
        onClick={() => {
          model.setFilter('')
        }}
      >
        Clear
      </Button>
    </div>
  )
})

export default FilterPanel
