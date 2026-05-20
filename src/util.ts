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

function isPlainObject(raw: unknown): raw is Record<string, unknown> {
  return !!raw && typeof raw === 'object' && !Array.isArray(raw)
}

function isStringArray(val: unknown): val is string[] {
  return (
    Array.isArray(val) && val.every((item: unknown) => typeof item === 'string')
  )
}

function asPlaylistConfig(val: unknown): PlaylistConfig | undefined {
  if (isStringArray(val)) {
    return { channels: val }
  }
  if (isPlainObject(val)) {
    const { channels } = val
    if (isStringArray(channels)) {
      return { channels }
    }
  }
  return undefined
}

export function parseChannels(raw: unknown): Record<string, string> {
  if (!isPlainObject(raw)) {
    return {}
  }
  const result: Record<string, string> = {}
  for (const [key, val] of Object.entries(raw)) {
    if (typeof val === 'string') {
      result[key] = val
    }
  }
  return result
}

export function parsePlaylists(raw: unknown): Record<string, PlaylistConfig> {
  if (!isPlainObject(raw)) {
    return {}
  }
  const result: Record<string, PlaylistConfig> = {}
  for (const [key, val] of Object.entries(raw)) {
    const config = asPlaylistConfig(val)
    if (config) {
      result[key] = config
    }
  }
  return result
}

export function clamp(p: number, min: number, max: number) {
  return Math.max(min, Math.min(max, p))
}

export function applyQueryToUrl(
  url: URL,
  query: string,
  playlist: string | null,
) {
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
