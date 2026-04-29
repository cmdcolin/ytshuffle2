import localforage from 'localforage'

import {
  getChannelLambdaEndpoint,
  getContentsLambdaEndpoint,
  getHandleLambdaEndpoint,
} from './consts'
import { myfetch } from './util'

import type { Item, Playlist, QueryItem } from './util'

interface PreItem {
  id: string
  snippet: {
    videoOwnerChannelTitle: string
    resourceId: { videoId: string }
    title: string
    publishedAt: string
    thumbnails?: {
      default?: { url: string }
      medium?: { url: string }
      high?: { url: string }
    }
  }
}

function remap(items: PreItem[]): Item[] {
  return items.map(item => ({
    id: item.id,
    channel: item.snippet.videoOwnerChannelTitle,
    videoId: item.snippet.resourceId.videoId,
    title: item.snippet.title,
    publishedAt: item.snippet.publishedAt,
    thumbnail: item.snippet.thumbnails?.medium?.url,
  }))
}

type ProgressCtx = {
  setProcessing: (arg: { current: number; total: number }) => void
}

export function getItemKey(item: QueryItem) {
  if ('videoId' in item) {
    return item.videoId
  }
  if ('playlistId' in item) {
    return item.playlistId
  }
  return item.handle
}

async function fetchPlaylistById(
  ctx: ProgressCtx,
  playlistId: string,
  signal: AbortSignal,
): Promise<Playlist> {
  let nextPageToken = ''
  const items: Item[] = []
  const url = `${getContentsLambdaEndpoint}?playlistId=${playlistId}`
  do {
    const res = await myfetch<{
      items: PreItem[]
      nextPageToken?: string
      totalResults?: number
    }>(url + (nextPageToken ? `&nextPageToken=${nextPageToken}` : ''), {
      signal,
    })
    for (const item of remap(res.items)) {
      items.push(item)
    }
    ctx.setProcessing({ current: items.length, total: res.totalResults ?? 0 })
    nextPageToken = res.nextPageToken ?? ''
  } while (nextPageToken)
  return items
}

async function fetchItemVideos(
  item: QueryItem,
  ctx: ProgressCtx,
  signal: AbortSignal,
): Promise<Playlist> {
  if ('playlistId' in item) {
    return fetchPlaylistById(ctx, item.playlistId, signal)
  }
  if ('videoId' in item) {
    ctx.setProcessing({ current: 0, total: 0 })
    const res = await myfetch<{ playlistId: string }>(
      `${getChannelLambdaEndpoint}?videoId=${item.videoId}`,
      { signal },
    )
    return fetchPlaylistById(ctx, res.playlistId, signal)
  }
  const res = await myfetch<{ playlistId: string }>(
    `${getHandleLambdaEndpoint}?handle=${item.handle}`,
    { signal },
  )
  return fetchPlaylistById(ctx, res.playlistId, signal)
}

export async function getCachedOrFetch(
  item: QueryItem,
  ctx: ProgressCtx,
  signal: AbortSignal,
): Promise<Playlist> {
  const key = getItemKey(item)
  let videos = await localforage.getItem<Playlist>(key)
  if (!videos) {
    videos = await fetchItemVideos(item, ctx, signal)
    await localforage.setItem(key, videos)
  }
  return videos
}
