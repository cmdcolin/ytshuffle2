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

async function myfetch(url: string) {
  const res = await fetch(url)
  if (!res.ok) {
    throw new HttpError(res.status, await res.text())
  }
  return res.json()
}

async function getVideos(handle: string) {
  const res1 = await myfetch(
    `${root}/channels?part=contentDetails&forHandle=${handle}&key=${API_KEY}`,
  )
  if (!res1.items?.[0]) {
    throw new HttpError(404, `Channel not found for handle: ${handle}`)
  }
  return res1.items[0].contentDetails.relatedPlaylists.uploads
}

export async function handler({
  queryStringParameters,
}: {
  queryStringParameters: { handle: string }
}) {
  try {
    const { handle } = queryStringParameters
    const result = await getVideos(handle)

    return {
      statusCode: 200,
      body: JSON.stringify({ playlistId: result }),
    }
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500
    return { statusCode: status, body: `${e}` }
  }
}
