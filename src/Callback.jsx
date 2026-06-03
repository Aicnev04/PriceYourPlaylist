import { useEffect, useRef, useState } from 'react'
import { exchangeCodeForToken } from './spotify-auth'
import './Callback.css'

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

    exchangeCodeForToken(code)
      .then(() => { 
        window.location.replace('/')  // stop refresh from throwing unauth code
       // window.history.replaceState({}, document.title, '/callback')
       })

      .catch((err) => {
        console.error('Token exchange failed:', err)
        setError('Something went wrong. Please try again.')})
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
