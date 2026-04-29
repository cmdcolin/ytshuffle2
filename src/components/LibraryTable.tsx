import { useState } from 'react'

import { formatDistanceToNowStrict } from 'date-fns'
import { observer } from 'mobx-react-lite'
import { FaChevronDown, FaChevronUp } from 'react-icons/fa6'

import styles from './LibraryTable.module.css'

import type { StoreModel } from '../store'
import type { Item } from '../util'

type SortKey = 'title' | 'channel' | 'publishedAt' | 'plays'
type SortDir = 'asc' | 'desc'
type Sort = { key: SortKey; dir: SortDir } | null

function compareItems(
  a: Item,
  b: Item,
  key: SortKey,
  dir: SortDir,
  playCounts: ReadonlyMap<string, number>,
) {
  let av: string | number
  let bv: string | number
  if (key === 'publishedAt') {
    av = new Date(a.publishedAt).getTime()
    bv = new Date(b.publishedAt).getTime()
  } else if (key === 'plays') {
    av = playCounts.get(a.videoId) ?? 0
    bv = playCounts.get(b.videoId) ?? 0
  } else {
    av = a[key] ?? ''
    bv = b[key] ?? ''
  }
  const cmp = av < bv ? -1 : av > bv ? 1 : 0
  return dir === 'asc' ? cmp : -cmp
}

function SortIcon({ dir }: { dir: SortDir | undefined }) {
  if (dir === 'asc') {
    return <FaChevronUp />
  }
  if (dir === 'desc') {
    return <FaChevronDown />
  }
  return null
}

const LibraryTable = observer(function ({ model }: { model: StoreModel }) {
  const { list } = model
  const [sort, setSort] = useState<Sort>(null)

  const toggleSort = (key: SortKey) => {
    if (sort?.key !== key) {
      setSort({ key, dir: 'asc' })
    } else if (sort.dir === 'asc') {
      setSort({ key, dir: 'desc' })
    } else {
      setSort(null)
    }
  }

  const { playCounts } = model
  const sorted = sort
    ? list.toSorted((a, b) =>
        compareItems(a, b, sort.key, sort.dir, playCounts),
      )
    : list

  const colHeader = (label: string, key: SortKey) => (
    <button
      onClick={() => {
        toggleSort(key)
      }}
    >
      {label} <SortIcon dir={sort?.key === key ? sort.dir : undefined} />
    </button>
  )

  const isLoading = model.channelProgress.size > 0

  return (
    <div className={styles.libraryScroll}>
      {model.error ? (
        <div className={styles.errorBox}>{model.error}</div>
      ) : null}
      {isLoading && list.length === 0 ? (
        <div className={styles.libraryStatus}>
          <div className={styles.spinner} />
          <span>Loading...</span>
        </div>
      ) : list.length > 0 ? (
        <table>
          <thead>
            <tr>
              <th>▶</th>
              <th>{colHeader('title', 'title')}</th>
              <th>{colHeader('channel', 'channel')}</th>
              <th>{colHeader('published', 'publishedAt')}</th>
              <th>{colHeader('plays', 'plays')}</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(item => {
              const plays = playCounts.get(item.videoId)
              return (
                <tr
                  key={item.videoId}
                  id={`vid${item.videoId}`}
                  className={styles.libraryRow}
                  onClick={() => {
                    model.setPlaying(item.videoId)
                  }}
                >
                  <td>{item.videoId === model.playing ? '▶' : ''}</td>
                  <td>{item.title}</td>
                  <td>{item.channel}</td>
                  <td>
                    {formatDistanceToNowStrict(new Date(item.publishedAt))}
                  </td>
                  <td>{plays}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      ) : (
        <p>
          {model.videoFlat.length > 0
            ? 'No videos match your filter'
            : 'No data loaded yet'}
        </p>
      )}
    </div>
  )
})

export default LibraryTable
