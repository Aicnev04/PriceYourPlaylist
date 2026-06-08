import LoginPage from './LoginPage'
import Callback from './Callback'
import HomePage from './HomePage'
import { isTokenValid } from './spotify-auth'

// picks which page to render based on the URL and whether we have a valid Spotify token
function App() {
  const path = window.location.pathname

  if (path === '/callback' && isTokenValid()) {
    window.location.replace('/')
    return null
  }

  const params = new URLSearchParams(window.location.search)
  const code = params.get('code')

  if (path === '/callback' && code) return <Callback />

  if (path === '/callback' && !code) {
    window.location.replace('/')
    return null
  }

  if (!isTokenValid()) return <LoginPage />

  return <HomePage />
}

export default App
