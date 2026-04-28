import LoginPage from './LoginPage'
import Callback from './Callback'
import HomePage from './HomePage'
import { isTokenValid } from './spotify-auth'

function App() {
  const path = window.location.pathname

  if (path === '/callback') return <Callback />
  if (!isTokenValid()) return <LoginPage />

  return <HomePage />
}

export default App
