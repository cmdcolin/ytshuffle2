const API_KEY = process.env.YOUTUBE_API_KEY
const root = 'https://www.googleapis.com/youtube/v3'

class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

async function fetchJson(url: string) {
  const res = await fetch(url)
  if (!res.ok) {
    throw new HttpError(res.status, await res.text())
  }
  return res.json()
}

async function getVideos(videoId: string) {
  const res0 = await fetchJson(
    `${root}/videos?part=snippet&id=${videoId}&key=${API_KEY}`,
  )
  if (!res0.items?.[0]) {
    throw new HttpError(404, `Video not found: ${videoId}`)
  }
  const channelId = res0.items[0].snippet.channelId
  const res1 = await fetchJson(
    `${root}/channels?part=contentDetails&id=${channelId}&key=${API_KEY}`,
  )
  if (!res1.items?.[0]) {
    throw new HttpError(404, `Channel not found for video: ${videoId}`)
  }
  return res1.items[0].contentDetails.relatedPlaylists.uploads
}

export async function handler({
  queryStringParameters,
}: {
  queryStringParameters: { videoId: string }
}) {
  try {
    const { videoId } = queryStringParameters
    const result = await getVideos(videoId)

    return {
      statusCode: 200,
      body: JSON.stringify({ playlistId: result }),
    }
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500
    return { statusCode: status, body: `${e}` }
  }
}
