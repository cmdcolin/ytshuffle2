import App from './App'

export default function StartScreen() {
  const params = new URLSearchParams(globalThis.location.search)
  const playlist = params.get('playlist') ?? ''
  return <App initialPlaylist={playlist} />
}
