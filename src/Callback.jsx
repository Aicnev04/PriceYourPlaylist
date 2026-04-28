import { useEffect, useState } from 'react'
import { exchangeCodeForToken } from './spotify-auth'
import './Callback.css'

function Callback() {
  const [error, setError] = useState(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const denied = params.get('error')

    if (denied) {
      setError('Spotify authorization was denied.')
      return
    }
    if (!code) {
      setError('No authorization code received.')
      return
    }

    exchangeCodeForToken(code)
      .then(() => { window.location.href = '/' })
      .catch(() => setError('Something went wrong. Please try again.'))
  }, [])

  return (
    <div className="callback-page">
      {error ? (
        <div className="callback-error">
          <p>{error}</p>
          <a href="/">Go back</a>
        </div>
      ) : (
        <div className="callback-loading">
          <div className="callback-spinner" />
          <p>Logging you in…</p>
        </div>
      )}
    </div>
  )
}

export default Callback
