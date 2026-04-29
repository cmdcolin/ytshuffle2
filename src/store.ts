import localforage from 'localforage'
import { autorun, makeAutoObservable, observable, runInAction } from 'mobx'

import { getCachedOrFetch, getItemKey } from './fetch'
import {
  incrementPlayCount,
  loadPlayCounts,
  loadUserData,
  saveUserData,
  subscribeToAuthChanges,
} from './firebase'
import { applyQueryToUrl, clamp, getVideoId, parsePlaylists } from './util'

import type { Playlist, PlaylistConfig } from './util'

class Store {
  filter = ''
  shuffle = true
  follow = true
  autoplay = true
  selectedChannelNames: string[] = []
  playing: string | undefined = undefined
  playlists: Record<string, PlaylistConfig>
  channels: Record<string, string>
  pendingUrlChannels: Record<string, string> = {}

  videoMap = observable.map<string, Playlist>()
  channelProgress = observable.map<string, { current: number; total: number }>()
  playCounts = observable.map<string, number>()
  error: string | undefined = undefined
  uid: string | null = null
  displayName: string | null = null
  photoURL: string | null = null
  authLoading = true

  private fetchRevision = 0
  private disposers: Array<() => void> = []

  constructor({ playlist }: { playlist: string }) {
    this.channels = JSON.parse(localStorage.getItem('channels') ?? '{}')
    this.playlists = parsePlaylists(
      JSON.parse(localStorage.getItem('playlists') ?? '{}'),
    )
    this.selectedChannelNames = this.playlists[playlist]?.channels ?? []
    this.applyUrlParams()
    makeAutoObservable(this, {
      videoMap: false,
      channelProgress: false,
      playCounts: false,
    })
    this.init()
  }

  destroy() {
    for (const disposer of this.disposers) {
      disposer()
    }
  }

  get playlistItems() {
    return this.selectedChannelNames.flatMap(name => {
      const url = this.channels[name] ?? this.pendingUrlChannels[name]
      if (!url) {
        return []
      }
      const item = getVideoId(url)
      if (!item) {
        return []
      }
      return [{ name, url, item, key: getItemKey(item) }]
    })
  }

  get query() {
    return this.playlistItems.map(p => p.url).join('\n')
  }

  get activePlaylistName() {
    const selected = new Set(this.selectedChannelNames)
    return (
      Object.entries(this.playlists).find(
        ([_, config]) =>
          config.channels.length === selected.size &&
          config.channels.every(c => selected.has(c)),
      )?.[0] ?? null
    )
  }

  setPlaying(arg?: string) {
    this.playing = arg
    if (arg !== undefined) {
      this.playCounts.set(arg, (this.playCounts.get(arg) ?? 0) + 1)
      if (this.uid) {
        void incrementPlayCount(this.uid, arg)
      }
    }
  }
  setPlaylist(arg: string) {
    this.selectedChannelNames = this.playlists[arg]?.channels ?? []
  }
  selectChannel(name: string) {
    this.selectedChannelNames = [name]
  }
  setFilter(arg: string) {
    this.filter = arg
  }
  setShuffle(arg: boolean) {
    this.shuffle = arg
  }
  setFollow(arg: boolean) {
    this.follow = arg
  }
  setAutoplay(arg: boolean) {
    this.autoplay = arg
  }
  applyAuthState(
    user: {
      uid: string
      displayName: string | null
      photoURL: string | null
    } | null,
  ) {
    this.uid = user?.uid ?? null
    this.displayName = user?.displayName ?? null
    this.photoURL = user?.photoURL ?? null
    this.authLoading = false
  }
  applyCloudPlayCounts(counts: Record<string, number>) {
    for (const [id, count] of Object.entries(counts)) {
      this.playCounts.set(id, count)
    }
  }
  setChannelProgress(
    name: string,
    progress: { current: number; total: number },
  ) {
    this.channelProgress.set(name, progress)
  }
  clearChannelProgress() {
    this.channelProgress.clear()
  }
  setChannelVideos(key: string, name: string, videos: Playlist) {
    this.videoMap.set(key, videos)
    this.channelProgress.delete(name)
  }
  pruneVideoMap(activeKeys: Set<string>) {
    for (const key of [...this.videoMap.keys()]) {
      if (!activeKeys.has(key)) {
        this.videoMap.delete(key)
      }
    }
  }
  invalidateChannel(key: string) {
    this.videoMap.delete(key)
    this.fetchRevision++
  }
  adoptCloudData(cloudData: {
    channels: Record<string, string>
    playlists: Record<string, PlaylistConfig>
  }) {
    this.channels = cloudData.channels
    this.playlists = cloudData.playlists
    if (!this.activePlaylistName) {
      const firstPlaylist = Object.keys(cloudData.playlists)[0]
      if (firstPlaylist) {
        this.selectedChannelNames = cloudData.playlists[firstPlaylist].channels
      }
    }
    for (const name of Object.keys(this.pendingUrlChannels)) {
      if (!this.selectedChannelNames.includes(name)) {
        this.selectedChannelNames = [...this.selectedChannelNames, name]
      }
    }
  }

  private persist() {
    if (this.uid) {
      void saveUserData(this.uid, {
        channels: this.channels,
        playlists: this.playlists,
      })
    } else {
      localStorage.setItem('channels', JSON.stringify(this.channels))
      localStorage.setItem('playlists', JSON.stringify(this.playlists))
    }
  }
  async refreshChannel(channelName: string) {
    const url = this.channels[channelName]
    if (!url) {
      return
    }
    const item = getVideoId(url)
    if (!item) {
      return
    }
    const key = getItemKey(item)
    await localforage.removeItem(key)
    this.invalidateChannel(key)
  }

  addChannel(name: string, url: string) {
    this.channels = { ...this.channels, [name]: url }
    this.persist()
  }

  removeChannel(name: string) {
    const { [name]: _removed, ...rest } = this.channels
    this.channels = rest
    this.playlists = Object.fromEntries(
      Object.entries(this.playlists).map(([pName, config]) => [
        pName,
        { ...config, channels: config.channels.filter(c => c !== name) },
      ]),
    )
    this.selectedChannelNames = this.selectedChannelNames.filter(
      c => c !== name,
    )
    this.persist()
  }

  savePlaylist(originalName: string, newName: string, channelNames: string[]) {
    const wasActive =
      originalName === '' || originalName === this.activePlaylistName
    const { [originalName]: _old, ...rest } = this.playlists
    this.playlists = { ...rest, [newName]: { channels: channelNames } }
    if (wasActive) {
      this.selectedChannelNames = channelNames
    }
    this.persist()
  }

  deletePlaylist(name: string) {
    const wasActive = name === this.activePlaylistName
    const { [name]: _removed, ...rest } = this.playlists
    this.playlists = rest
    if (wasActive) {
      const first = Object.keys(rest)[0]
      if (first) {
        this.setPlaylist(first)
      } else {
        this.selectedChannelNames = []
      }
    }
    this.persist()
  }

  get videoFlat() {
    return [...this.videoMap.values()].flat()
  }
  get list() {
    if (!this.filter) {
      return this.videoFlat
    }
    const lc = this.filter.toLowerCase()
    return this.videoFlat.filter(
      video =>
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        video.channel?.toLowerCase().includes(lc) ||
        video.title?.toLowerCase().includes(lc),
    )
  }
  index(r: number) {
    const p = this.list
    return p[
      this.shuffle
        ? Math.floor(Math.random() * p.length)
        : clamp(
            p.findIndex(v => this.playing === v.videoId) + r,
            0,
            p.length - 1,
          )
    ]
  }

  goToNext() {
    const item = this.index(1)
    if (item) {
      this.setPlaying(item.videoId)
    }
  }
  goToPrev() {
    const item = this.index(-1)
    if (item) {
      this.setPlaying(item.videoId)
    }
  }

  private applyUrlParams() {
    const params = new URLSearchParams(globalThis.location.search)
    const sources = [
      ['handles', (h: string) => `https://youtube.com/@${h}`],
      ['ids', (id: string) => `https://www.youtube.com/watch?v=${id}`],
      ['pids', (pid: string) => `https://www.youtube.com/playlist?list=${pid}`],
    ] as const
    for (const [key, toUrl] of sources) {
      for (const name of (params.get(key) ?? '').split(',').filter(Boolean)) {
        if (!this.channels[name]) {
          this.pendingUrlChannels[name] = toUrl(name)
        }
        if (!this.selectedChannelNames.includes(name)) {
          this.selectedChannelNames.push(name)
        }
      }
    }
  }

  acceptPendingUrlChannels() {
    this.channels = { ...this.channels, ...this.pendingUrlChannels }
    this.pendingUrlChannels = {}
    this.persist()
  }

  dismissPendingUrlChannels() {
    const pending = new Set(Object.keys(this.pendingUrlChannels))
    this.selectedChannelNames = this.selectedChannelNames.filter(
      n => !pending.has(n),
    )
    this.pendingUrlChannels = {}
  }

  private init() {
    this.disposers.push(
      subscribeToAuthChanges(user => {
        const wasSignedIn = this.uid !== null
        this.applyAuthState(user)
        if (user) {
          void Promise.all([
            loadUserData(user.uid),
            loadPlayCounts(user.uid),
          ]).then(([cloudData, counts]) => {
            runInAction(() => {
              if (cloudData) {
                this.adoptCloudData(cloudData)
              } else {
                void saveUserData(user.uid, {
                  channels: this.channels,
                  playlists: this.playlists,
                })
              }
              this.applyCloudPlayCounts(counts)
            })
          })
        } else if (wasSignedIn) {
          this.playCounts.clear()
          this.persist()
        }
      }),
    )

    let controller = new AbortController()
    this.disposers.push(() => {
      controller.abort()
    })
    this.disposers.push(
      autorun(async () => {
        void this.fetchRevision
        controller.abort()
        controller = new AbortController()
        const { signal } = controller
        this.clearChannelProgress()
        const playlistItems = this.playlistItems
        const activeKeys = new Set(playlistItems.map(p => p.key))
        this.pruneVideoMap(activeKeys)
        runInAction(() => {
          this.error = undefined
        })
        let fetchingChannel = ''
        try {
          for (const { name, item, key } of playlistItems) {
            fetchingChannel = name
            this.setChannelProgress(name, { current: 0, total: 0 })
            const ctx = {
              setProcessing: (progress: { current: number; total: number }) => {
                this.setChannelProgress(name, progress)
              },
            }
            const videos = await getCachedOrFetch(item, ctx, signal)
            if (signal.aborted) {
              return
            }
            this.setChannelVideos(key, name, videos)
          }
        } catch (error) {
          if (
            signal.aborted ||
            (error instanceof Error && error.name === 'AbortError')
          ) {
            return
          }
          const msg = error instanceof Error ? error.message : `${error}`
          const withContext = fetchingChannel
            ? `"${fetchingChannel}": ${msg}`
            : msg
          console.error(withContext)
          runInAction(() => {
            this.error = withContext
            this.channelProgress.clear()
          })
        }
      }),
    )

    this.disposers.push(
      autorun(() => {
        const url = new URL(globalThis.location.href)
        applyQueryToUrl(url, this.query, this.activePlaylistName ?? '')
        globalThis.history.replaceState({}, '', url)
      }),
    )

    this.disposers.push(
      autorun(() => {
        if (this.follow && this.playing) {
          document
            .querySelector(`#vid${this.playing}`)
            ?.scrollIntoView({ block: 'center', behavior: 'smooth' })
        }
      }),
    )
  }
}

export function createStore(args: { playlist: string }) {
  return new Store(args)
}

export type StoreModel = Store
