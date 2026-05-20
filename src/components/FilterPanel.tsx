import { observer } from 'mobx-react-lite'

import styles from './FilterPanel.module.css'

import type { StoreModel } from '../store'

const FilterPanel = observer(function ({ model }: { model: StoreModel }) {
  return (
    <div className={styles.controls}>
      <label htmlFor="filter">Search:</label>
      <input
        id="filter"
        type="text"
        value={model.filterInput}
        onChange={event => {
          model.setFilter(event.target.value)
        }}
      />
      <button
        onClick={() => {
          model.setFilter('')
        }}
      >
        Clear
      </button>
    </div>
  )
})

export default FilterPanel
