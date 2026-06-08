import { useEffect, useRef, useState } from 'react'
import { exchangeCodeForToken } from './spotify-auth'
import './Callback.css'

// landing page for the Spotify OAuth redirect — grabs the auth code from the
// URL, swaps it for tokens, and bounces back home (or shows an error)
function Callback() {
  const [error, setError] = useState(null)
  const exchanged = useRef(false)

  useEffect(() => {
    if (exchanged.current) return
    exchanged.current = true

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

    const controller = new AbortController()

    exchangeCodeForToken(code, controller.signal)
      .then(() => { window.location.replace('/') })
      .catch((err) => {
        if (err.name === 'AbortError') return
        console.error('Token exchange failed:', err)
        setError('Something went wrong. Please try again.')
      })

    return () => controller.abort()
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
