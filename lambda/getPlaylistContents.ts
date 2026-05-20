const API_KEY = process.env.YOUTUBE_API_KEY
const root = 'https://www.googleapis.com/youtube/v3'
const playlistRoot = `${root}/playlistItems?part=snippet`

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
async function getVideos(
  playlistId: string,
  nextPageToken?: string,
  maxResults = '50',
) {
  let url = `${playlistRoot}&maxResults=${maxResults}&playlistId=${playlistId}&key=${API_KEY}`
  if (nextPageToken) {
    url += `&pageToken=${nextPageToken}`
  }
  const res = await fetchJson(url)
  return {
    items: res.items,
    nextPageToken: res.nextPageToken,
    totalResults: res.pageInfo.totalResults,
  }
}
export async function handler({
  queryStringParameters,
}: {
  queryStringParameters: { playlistId?: string; nextPageToken?: string }
}) {
  try {
    const { playlistId, nextPageToken } = queryStringParameters
    if (!playlistId) {
      throw new Error('No playlistId specified')
    }
    const result = await getVideos(playlistId, nextPageToken)
    return {
      statusCode: 200,
      body: JSON.stringify(result),
    }
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500
    return { statusCode: status, body: `${e}` }
  }
}
