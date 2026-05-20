import './LoginPage.css'
import { redirectToSpotify } from './spotify-auth'

const SpotifyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
  </svg>
)

const grooveRadii = [46, 44.5, 43, 41.5, 40, 38.5, 37, 35.5, 34, 32.5, 31, 29.5, 28, 26.5, 25, 23.5, 22]

// Small spinning vinyl used in the eyebrow
const VinylMark = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="52" height="52" aria-hidden="true" className="login-vinyl-sm">
    <circle cx="50" cy="50" r="49" fill="#1a1a1a" />
    <circle cx="50" cy="50" r="48.5" fill="none" stroke="#2e2e2e" strokeWidth="1" />
    {grooveRadii.map((r, i) => (
      <circle key={r} cx="50" cy="50" r={r} fill="none"
        stroke={i % 2 === 0 ? '#111' : '#252525'} strokeWidth="1.2" />
    ))}
    <circle cx="50" cy="50" r="20" fill="#212121" />
    <circle cx="50" cy="50" r="18" fill="#18a549" />
    <circle cx="50" cy="50" r="14" fill="none" stroke="#15943f" strokeWidth="0.6" />
    <circle cx="50" cy="50" r="2.5" fill="#0a0a0a" />
  </svg>
)

// Groove radii for the large turntable vinyl (px, from outer to inner)
const tGrooves = Array.from({ length: 24 }, (_, i) => 148 - i * 3)

// cx/cy of the record in the turntable SVG
const RX = 168
const RY = 215

const Turntable = () => (
  <svg
    viewBox="0 0 400 420"
    className="turntable-svg"
    aria-hidden="true"
  >
    {/* Platter base — slightly larger dark disc */}
    <circle cx={RX} cy={RY} r="163" fill="#0d0d0d" stroke="#1c1c1c" strokeWidth="1.5" />

    {/* === Spinning vinyl group === */}
    <g className="vinyl-spin" style={{ transformOrigin: `${RX}px ${RY}px` }}>
      {/* Record body */}
      <circle cx={RX} cy={RY} r="148" fill="#191919" />
      <circle cx={RX} cy={RY} r="148" fill="none" stroke="#2a2a2a" strokeWidth="0.8" />
      {/* Groove rings */}
      {tGrooves.map((r, i) => (
        <circle key={r} cx={RX} cy={RY} r={r} fill="none"
          stroke={i % 2 === 0 ? '#151515' : '#212121'} strokeWidth="1.4" />
      ))}
      {/* Lead-out band */}
      <circle cx={RX} cy={RY} r="55" fill="#161616" />
      {/* Label */}
      <circle cx={RX} cy={RY} r="50" fill="#18a549" />
      <circle cx={RX} cy={RY} r="38" fill="none" stroke="#15943f" strokeWidth="0.9" />
      <circle cx={RX} cy={RY} r="27" fill="none" stroke="#15943f" strokeWidth="0.4" />
      {/* Spindle hole */}
      <circle cx={RX} cy={RY} r="6.5" fill="#0a0a0a" />
    </g>

    {/* === Tonearm (static) === */}

    {/* Pivot mount base */}
    <circle cx="352" cy="70" r="21" fill="#191919" stroke="#282828" strokeWidth="1.5" />
    <circle cx="352" cy="70" r="12" fill="#212121" stroke="#2e2e2e" strokeWidth="1" />
    <circle cx="352" cy="70" r="4.5" fill="#3a3a3a" />

    {/* Counterweight — bulge on the far side of the pivot */}
    {/* Arm direction toward stylus: (250,142)-(352,70) → (-102, 72). Opposite: (102,-72), unit ≈ (0.817, -0.577) */}
    {/* Counterweight center: 352+26*0.817, 70+26*(-0.577) ≈ (373, 55) */}
    <ellipse cx="374" cy="54" rx="14" ry="9" fill="#1d1d1d" stroke="#2a2a2a" strokeWidth="1" />

    {/* Main arm body — counterweight side through pivot to headshell */}
    <line
      x1="374" y1="54"
      x2="252" y2="142"
      stroke="#8a8a8a" strokeWidth="5" strokeLinecap="round"
    />

    {/* Headshell — slight angled kink at the end of the arm */}
    <line
      x1="252" y1="142"
      x2="241" y2="157"
      stroke="#797979" strokeWidth="4.5" strokeLinecap="round"
    />

    {/* Cartridge body */}
    <rect
      x="234" y="154"
      width="14" height="8"
      rx="1.5"
      fill="#252525" stroke="#333" strokeWidth="0.8"
      transform="rotate(-33 241 158)"
    />

    {/* Stylus needle tip touching the groove */}
    <circle cx="240" cy="160" r="2" fill="#18a549" opacity="0.85" />
  </svg>
)

const steps = [
  'Connect your Spotify account',
  'Choose any of your playlists',
  'See real Discogs vinyl prices for each track',
]

function LoginPage() {
  return (
    <div className="login-page">

      <div className="login-left">
        <div className="login-eyebrow">
          <VinylMark />
          <span className="login-brand">Price Your Playlist</span>
        </div>

        <h1 className="login-headline">
          What is your<br />
          music taste<br />
          <span className="login-headline__accent">worth?</span>
        </h1>

        <p className="login-sub">
          We look up every track in your Spotify playlists on Discogs
          and show you real vinyl market prices — no account needed.
        </p>

        <div className="login-divider" />

        <ol className="login-steps">
          {steps.map((text, i) => (
            <li key={i} className="login-step">
              <span className="login-step__num">0{i + 1}</span>
              <span className="login-step__text">{text}</span>
            </li>
          ))}
        </ol>

        <button className="login-btn" onClick={redirectToSpotify}>
          <SpotifyIcon />
          Connect with Spotify
        </button>

        <p className="login-disclaimer">
          Read-only access · No data stored · No posting on your behalf
        </p>

        <footer className="login-footer">
          Price Your Playlist &copy; {new Date().getFullYear()}
        </footer>
      </div>

      <div className="login-right">
        <div className="login-right-glow" />
        <Turntable />
      </div>

    </div>
  )
}

export default LoginPage
