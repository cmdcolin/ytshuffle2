import localforage from 'localforage'
import {
  autorun,
  makeAutoObservable,
  observable,
  runInAction,
  untracked,
} from 'mobx'

import { getCachedOrFetch, getItemKey } from './fetch'
import {
  incrementPlayCount,
  loadPlayCounts,
  loadUserData,
  saveUserData,
  subscribeToAuthChanges,
} from './firebase'
import { applyQueryToUrl, clamp, getVideoId, parseChannels } from './util'

import type { Playlist, PlaylistConfig } from './util'

function omit<V>(obj: Record<string, V>, key: string): Record<string, V> {
  const { [key]: _, ...rest } = obj
  return rest
}

function loadLocalChannels(): Record<string, string> {
  return parseChannels(JSON.parse(localStorage.getItem('channels') ?? '{}'))
}

function channelsFromUrl(): Record<string, string> {
  const params = new URLSearchParams(globalThis.location.search)
  const sources = [
    ['handles', (h: string) => `https://youtube.com/@${h}`],
    ['ids', (id: string) => `https://www.youtube.com/watch?v=${id}`],
    ['pids', (pid: string) => `https://www.youtube.com/playlist?list=${pid}`],
  ] as const
  const result: Record<string, string> = {}
  for (const [key, toUrl] of sources) {
    for (const name of (params.get(key) ?? '').split(',').filter(Boolean)) {
      result[name] = toUrl(name)
    }
  }
  return result
}

class Store {
  filter = ''
  filterInput = ''
  shuffle = true
  follow = true
  autoplay = true
  activePlaylistName: string | null = null
  selectedChannel: string | null = null
  playing: string | undefined = undefined
  playlists: Record<string, PlaylistConfig>
  channels: Record<string, string>

  videoMap = observable.map<string, Playlist>()
  channelProgress = observable.map<string, { current: number; total: number }>()
  playCounts = observable.map<string, number>()
  error: string | undefined = undefined
  uid: string | null = null
  displayName: string | null = null
  photoURL: string | null = null
  authLoading = true

  private readonly initialPlaylist: string
  private filterTimer: ReturnType<typeof setTimeout> | undefined

  constructor({ playlist }: { playlist: string }) {
    this.initialPlaylist = playlist
    const stored = loadLocalChannels()
    const fromUrl = channelsFromUrl()
    const addedFromUrl = Object.keys(fromUrl).some(name => !stored[name])
    this.channels = { ...fromUrl, ...stored }
    this.playlists = {}
    makeAutoObservable(this, {
      videoMap: false,
      channelProgress: false,
      playCounts: false,
    })
    if (addedFromUrl) {
      void this.persist()
    }
    this.init()
  }

  get playlistItems() {
    return this.selectedChannelNames.flatMap(name => {
      const url = this.channels[name]
      if (url) {
        const item = getVideoId(url)
        if (item) {
          return [{ name, url, item, key: getItemKey(item) }]
        }
      }
      return []
    })
  }

  get query() {
    return this.playlistItems.map(p => p.url).join('\n')
  }

  get selectedChannelNames() {
    const config = this.activePlaylistName
      ? this.playlists[this.activePlaylistName]
      : undefined
    return config
      ? config.channels
      : this.selectedChannel && this.channels[this.selectedChannel]
        ? [this.selectedChannel]
        : Object.keys(this.channels)
  }

  setPlaying(videoId: string) {
    this.playing = videoId
    this.playCounts.set(videoId, (this.playCounts.get(videoId) ?? 0) + 1)
    if (this.uid) {
      incrementPlayCount(this.uid, videoId).catch((error: unknown) => {
        console.error('incrementPlayCount failed', error)
      })
    }
  }
  stopPlaying() {
    this.playing = undefined
  }
  setPlaylist(arg: string) {
    this.activePlaylistName = arg
    this.selectedChannel = null
  }
  setSelectedChannel(name: string) {
    this.selectedChannel = this.selectedChannel === name ? null : name
  }
  setFilter(arg: string) {
    this.filterInput = arg
    clearTimeout(this.filterTimer)
    this.filterTimer = setTimeout(() => {
      runInAction(() => {
        this.filter = arg
      })
    }, 200)
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
  setError(msg: string | undefined) {
    this.error = msg
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
  adoptCloudData(cloudData: {
    channels: Record<string, string>
    playlists: Record<string, PlaylistConfig>
  }) {
    this.channels = cloudData.channels
    this.playlists = cloudData.playlists
    const firstKey = Object.keys(cloudData.playlists)[0]
    this.activePlaylistName = cloudData.playlists[this.initialPlaylist]
      ? this.initialPlaylist
      : (firstKey ?? null)
  }

  private async persist() {
    if (this.uid) {
      try {
        await saveUserData(this.uid, {
          channels: this.channels,
          playlists: this.playlists,
        })
      } catch (error: unknown) {
        console.error('saveUserData failed', error)
        this.setError('Failed to save your library. Check your connection.')
      }
    } else {
      localStorage.setItem('channels', JSON.stringify(this.channels))
    }
  }
  async refreshChannel(channelName: string) {
    const url = this.channels[channelName]
    if (url) {
      const item = getVideoId(url)
      if (item) {
        const key = getItemKey(item)
        await localforage.removeItem(key)
        this.videoMap.delete(key)
      }
    }
  }

  addChannel(name: string, url: string) {
    this.channels = { ...this.channels, [name]: url }
    void this.persist()
  }

  removeChannel(name: string) {
    this.channels = omit(this.channels, name)
    this.playlists = Object.fromEntries(
      Object.entries(this.playlists).map(([pName, config]) => [
        pName,
        { ...config, channels: config.channels.filter(c => c !== name) },
      ]),
    )
    void this.persist()
  }

  savePlaylist(originalName: string, newName: string, channelNames: string[]) {
    this.playlists = {
      ...omit(this.playlists, originalName),
      [newName]: { channels: channelNames },
    }
    if (originalName === '' || originalName === this.activePlaylistName) {
      this.activePlaylistName = newName
    }
    void this.persist()
  }

  deletePlaylist(name: string) {
    this.playlists = omit(this.playlists, name)
    if (name === this.activePlaylistName) {
      this.activePlaylistName = Object.keys(this.playlists)[0] ?? null
    }
    void this.persist()
  }

  get videoFlat() {
    return [...this.videoMap.values()].flat()
  }
  get list() {
    const lc = this.filter.toLowerCase()
    return lc
      ? this.videoFlat.filter(video =>
          `${video.channel ?? ''} ${video.title ?? ''}`
            .toLowerCase()
            .includes(lc),
        )
      : this.videoFlat
  }
  private nextItem(direction: 1 | -1) {
    const items = this.list
    if (this.shuffle) {
      return items[Math.floor(Math.random() * items.length)]
    } else {
      const current = items.findIndex(v => v.videoId === this.playing)
      return items[clamp(current + direction, 0, items.length - 1)]
    }
  }

  goToNext() {
    const item = this.nextItem(1)
    if (item) {
      this.setPlaying(item.videoId)
    }
  }
  goToPrev() {
    const item = this.nextItem(-1)
    if (item) {
      this.setPlaying(item.videoId)
    }
  }

  private async handleAuthChange(
    user: {
      uid: string
      displayName: string | null
      photoURL: string | null
    } | null,
  ) {
    const wasSignedIn = this.uid !== null
    this.uid = user?.uid ?? null
    this.displayName = user?.displayName ?? null
    this.photoURL = user?.photoURL ?? null
    this.authLoading = false
    if (user) {
      try {
        const [cloudData, counts] = await Promise.all([
          loadUserData(user.uid),
          loadPlayCounts(user.uid),
        ])
        runInAction(() => {
          if (cloudData) {
            this.adoptCloudData(cloudData)
          } else {
            void this.persist()
          }
          this.applyCloudPlayCounts(counts)
        })
      } catch (error: unknown) {
        console.error('loadUserData failed', error)
        this.setError('Failed to load your library from cloud.')
      }
    } else if (wasSignedIn) {
      this.playCounts.clear()
      this.playlists = {}
      this.activePlaylistName = null
      this.channels = loadLocalChannels()
    }
  }

  private setupKeyboard() {
    document.addEventListener('keydown', event => {
      const t = event.target
      const inField = t instanceof Element && t.matches('input, textarea')
      if (!inField) {
        if (event.key === 'ArrowLeft') {
          event.preventDefault()
          this.goToPrev()
        } else if (event.key === 'ArrowRight') {
          event.preventDefault()
          this.goToNext()
        }
      }
    })
  }

  private async loadVideos(signal: AbortSignal) {
    const playlistItems = this.playlistItems
    const activeKeys = new Set(playlistItems.map(p => p.key))
    this.channelProgress.clear()
    for (const key of this.videoMap.keys()) {
      if (!activeKeys.has(key)) {
        this.videoMap.delete(key)
      }
    }
    runInAction(() => {
      this.error = undefined
    })
    let fetchingChannel = ''
    try {
      for (const { name, item, key } of playlistItems) {
        const alreadyLoaded = untracked(() => this.videoMap.has(key))
        if (alreadyLoaded) {
          continue
        }
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
        this.videoMap.set(key, videos)
        this.channelProgress.delete(name)
      }
    } catch (error) {
      if (
        signal.aborted ||
        (error instanceof Error && error.name === 'AbortError')
      ) {
        return
      }
      const msg = error instanceof Error ? error.message : `${error}`
      const withContext = fetchingChannel ? `"${fetchingChannel}": ${msg}` : msg
      console.error(withContext)
      runInAction(() => {
        this.error = withContext
        this.channelProgress.clear()
      })
    }
  }

  private init() {
    subscribeToAuthChanges(user => {
      void this.handleAuthChange(user)
    })
    this.setupKeyboard()

    let controller = new AbortController()
    autorun(() => {
      controller.abort()
      controller = new AbortController()
      void this.loadVideos(controller.signal)
    })

    autorun(() => {
      const url = new URL(globalThis.location.href)
      applyQueryToUrl(url, this.query, this.activePlaylistName)
      globalThis.history.replaceState({}, '', url)
    })

    autorun(() => {
      if (this.follow && this.playing) {
        document
          .querySelector(`#vid${this.playing}`)
          ?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      }
    })
  }
}

export function createStore(args: { playlist: string }) {
  return new Store(args)
}

export type StoreModel = Store
