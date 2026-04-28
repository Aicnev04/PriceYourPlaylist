import './LoginPage.css'
import { redirectToSpotify } from './spotify-auth'

const SpotifyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
  </svg>
)

const grooveRadii = [46, 44.5, 43, 41.5, 40, 38.5, 37, 35.5, 34, 32.5, 31, 29.5, 28, 26.5, 25, 23.5, 22]

const VinylIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="88" height="88" aria-hidden="true">
    {/* Record body */}
    <circle cx="50" cy="50" r="49" fill="#1a1a1a" />
    {/* Outer rim highlight */}
    <circle cx="50" cy="50" r="48.5" fill="none" stroke="#2e2e2e" strokeWidth="1" />
    {/* Groove rings — alternating dark/slightly-less-dark to simulate depth */}
    {grooveRadii.map((r, i) => (
      <circle key={r} cx="50" cy="50" r={r} fill="none"
        stroke={i % 2 === 0 ? '#111' : '#252525'} strokeWidth="1.2" />
    ))}
    {/* Lead-out band (smooth ring just outside the label) */}
    <circle cx="50" cy="50" r="20" fill="#212121" />
    {/* Center label */}
    <circle cx="50" cy="50" r="18" fill="#1DB954" />
    {/* Label inner detail ring */}
    <circle cx="50" cy="50" r="14" fill="none" stroke="#18a84a" strokeWidth="0.6" />
    {/* Spindle hole */}
    <circle cx="50" cy="50" r="2.5" fill="#0a0a0a" />
  </svg>
)

function LoginPage() {
  return (
    <div className="login-page">
      <div className="login-container">
        <div className="brand">
          <VinylIcon />
          <h1 className="brand-name">Price Your Playlist</h1>
          <p className="brand-tagline">Find out what your music taste is actually worth.</p>
        </div>

        <div className="login-actions">
          <button className="spotify-btn" onClick={redirectToSpotify}>
            <SpotifyIcon />
            Connect with Spotify
          </button>
        </div>

        <p className="login-disclaimer">
          We access your playlists to find where you can buy your songs —<br />
          digitally or as physical copies.<br />
          We never store your data or post on your behalf.
        </p>
      </div>

      <footer className="login-footer">
        Price Your Playlist &copy; {new Date().getFullYear()}
      </footer>
    </div>
  )
}

export default LoginPage
