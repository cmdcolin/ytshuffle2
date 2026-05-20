export async function fetchJson<T>(url: string, rest?: RequestInit) {
  const response = await fetch(url, rest)
  if (!response.ok) {
    const endpoint = new URL(url).pathname.split('/').pop() ?? url
    const body = await response.text()
    throw new Error(`HTTP ${response.status} from ${endpoint}: ${body}`)
  }
  return response.json() as T
}

// xref https://stackoverflow.com/a/9102270/2129219
export function getVideoId(url: string) {
  if (
    url.startsWith('https://www.youtube.com/@') ||
    url.startsWith('https://youtube.com/@')
  ) {
    const handle = url
      .replace(/^https:\/\/(www\.)?youtube\.com\/@/, '')
      .split('?')[0]
    return handle === undefined ? undefined : { handle }
  }
  const match1 = /^.*?list=(.*?)(?:&|$)/.exec(url)
  if (match1) {
    const playlistId = match1[1]
    return playlistId === undefined ? undefined : { playlistId }
  }
  const match2 =
    /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/.exec(url)
  const videoId = match2?.[2]
  return videoId?.length === 11 ? { videoId } : undefined
}

export type QueryItem =
  | { videoId: string }
  | { playlistId: string }
  | { handle: string }

export function getIds(text: string): QueryItem[] {
  return text.split('\n').flatMap(line => {
    const item = getVideoId(line.trim())
    return item ? [item] : []
  })
}

export interface Item {
  id: string
  channel?: string
  videoId: string
  title?: string
  publishedAt: string
  thumbnail?: string
}

export type Playlist = Item[]

export interface PlaylistConfig {
  channels: string[]
}

export function parseChannels(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {}
  }
  return Object.fromEntries(
    Object.entries(raw as Record<string, unknown>).filter(
      (e): e is [string, string] => typeof e[1] === 'string',
    ),
  )
}

export function parsePlaylists(raw: unknown): Record<string, PlaylistConfig> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {}
  }
  return Object.fromEntries(
    Object.entries(raw as Record<string, unknown>).flatMap(
      ([key, val]): [string, PlaylistConfig][] => {
        if (Array.isArray(val) && val.every(item => typeof item === 'string')) {
          return [[key, { channels: val }]]
        }
        if (
          val &&
          typeof val === 'object' &&
          !Array.isArray(val) &&
          'channels' in val
        ) {
          const channels = (val as Record<string, unknown>).channels
          if (
            Array.isArray(channels) &&
            channels.every(item => typeof item === 'string')
          ) {
            return [[key, { channels: channels }]]
          }
        }
        return []
      },
    ),
  )
}

export function clamp(p: number, min: number, max: number) {
  return Math.max(min, Math.min(max, p))
}

export function applyQueryToUrl(url: URL, query: string, playlist: string) {
  const items = getIds(query)
  const setParam = (key: string, values: string[]) => {
    if (values.length > 0) {
      url.searchParams.set(key, values.join(','))
    } else {
      url.searchParams.delete(key)
    }
  }
  setParam(
    'ids',
    items.flatMap(f => ('videoId' in f ? [f.videoId] : [])),
  )
  setParam(
    'pids',
    items.flatMap(f => ('playlistId' in f ? [f.playlistId] : [])),
  )
  setParam(
    'handles',
    items.flatMap(f => ('handle' in f ? [f.handle] : [])),
  )
  if (playlist) {
    url.searchParams.set('playlist', playlist)
  } else {
    url.searchParams.delete('playlist')
  }
}

