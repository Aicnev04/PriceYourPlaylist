import { useEffect, useState } from 'react'
import { getAccessToken, logout } from './spotify-auth'
import './HomePage.css'

const API = import.meta.env.VITE_API_URL || ''

async function spotifyFetch(path) {
  const token = getAccessToken()
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return res.json()
}

function SkeletonCard() {
  return (
    <div className="home-playlist-card home-playlist-card--skeleton">
      <div className="skeleton skeleton--image" />
      <div className="skeleton skeleton--title" />
      <div className="skeleton skeleton--meta" />
    </div>
  )
}

function SkeletonTrackRow() {
  return (
    <div className="home-track-row">
      <div className="home-track-row__inner">
        <div className="skeleton skeleton--index" />
        <div className="skeleton skeleton--thumb" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
          <div className="skeleton skeleton--name" />
          <div className="skeleton skeleton--artist" />
        </div>
        <div className="skeleton skeleton--duration" />
        <div className="skeleton skeleton--price" />
        <div className="skeleton skeleton--buy" />
      </div>
    </div>
  )
}

function TrackRow({ track, index }) {
  const formatDuration = (ms) => {
    if (!ms) return '0:00'
    const s = Math.floor(ms / 1000)
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  }

  const price    = track.price
  const hasPrice = price?.price != null
  const hasLink  = Boolean(price?.link)

  return (
    <div className="home-track-row" style={{ animationDelay: `${Math.min(index * 30, 600)}ms` }}>
      <div className="home-track-row__inner">
        <div className="home-track-row__index">{index + 1}</div>
        {track.album_image
          ? <img className="home-track-row__thumb" src={track.album_image} alt="" />
          : <div className="home-track-row__thumb home-track-row__thumb--placeholder" />
        }
        <div style={{ minWidth: 0 }}>
          <div className="home-track-row__name">{track.name}</div>
          <div className="home-track-row__artist">{(track.artists || []).join(', ')}</div>
        </div>
        <div className="home-track-row__duration">{formatDuration(track.duration_ms)}</div>
        <div className="home-track-row__price-amount">
          {hasPrice ? `$${Number(price.price).toFixed(2)}` : ''}
        </div>
        <div className="home-track-row__buy">
          {hasLink && (
            <a
              className="home-track-row__buy-btn"
              href={price.link}
              target="_blank"
              rel="noopener noreferrer"
            >
              {hasPrice ? 'Buy' : 'Link'}
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

function PlaylistCard({ pl, onClick, index }) {
  return (
    <div
      className="home-playlist-card"
      style={{ animationDelay: `${Math.min(index * 40, 800)}ms` }}
      onClick={() => onClick(pl)}
    >
      {pl.image_url
        ? <img className="home-playlist-card__image" src={pl.image_url} alt={pl.name} />
        : <div className="home-playlist-card__placeholder">♪</div>
      }
      <div className="home-playlist-card__name">{pl.name}</div>
      <div className="home-playlist-card__meta">{pl.track_count} tracks</div>
      <div className="home-playlist-card__cta">Price it →</div>
    </div>
  )
}

function PlaylistDetail({ playlist, onBack }) {
  const [tracks,      setTracks]      = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState(null)
  const [totalPrice,  setTotalPrice]  = useState(0)
  const [pricedCount, setPricedCount] = useState(0)

  useEffect(() => {
    if (!playlist) return
    setLoading(true)
    setTracks(null)
    setError(null)
    setTotalPrice(0)
    setPricedCount(0)

    spotifyFetch(`/api/spotify/playlists/${playlist.id}/tracks`)
      .then(data => {
        setTracks(data.tracks)
        const priced = data.tracks.filter(t => t.price?.found && t.price?.price != null)
        setPricedCount(priced.length)
        setTotalPrice(priced.reduce((sum, t) => sum + parseFloat(t.price.price), 0))
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [playlist])

  return (
    <div className="home-detail">
      <button className="home-back-btn" onClick={onBack}>← Back to playlists</button>

      <div className="home-detail-header">
        {playlist.image_url
          ? <img className="home-detail-cover" src={playlist.image_url} alt={playlist.name} />
          : <div className="home-detail-cover--placeholder">♪</div>
        }
        <div className="home-detail-info">
          <div className="home-detail-title">{playlist.name}</div>
          <div className="home-detail-meta">
            by {playlist.owner} · {playlist.track_count} tracks
            {playlist.public === false &&
              <span className="home-detail-badge home-detail-badge--private"> PRIVATE</span>}
            {playlist.collaborative &&
              <span className="home-detail-badge home-detail-badge--collab"> COLLAB</span>}
          </div>
          {!loading && tracks && (
            <div className="home-stats-row">
              <div className="home-stat">
                <span className="home-stat__value">{tracks.length}</span>
                <span className="home-stat__label">Tracks</span>
              </div>
              <div className="home-stat">
                <span className="home-stat__value">{pricedCount}</span>
                <span className="home-stat__label">Priced</span>
              </div>
              <div className="home-stat">
                <span className="home-stat__value home-stat__value--highlight">
                  ${totalPrice.toFixed(2)}
                </span>
                <span className="home-stat__label">Total Value</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {error && <div className="home-error">{error}</div>}

      {loading && Array.from({ length: 8 }).map((_, i) => <SkeletonTrackRow key={i} />)}

      {tracks && (
        <>
          <div className="home-track-hint"># · Track · Duration · Price</div>
          {tracks.map((track, i) => (
            <TrackRow key={track.id ?? i} track={track} index={i} />
          ))}
        </>
      )}
    </div>
  )
}

function LoadingPulse({ label = 'Loading…' }) {
  return (
    <div className="home-loading">
      <div className="home-loading__dot" />
      <span className="home-loading__label">{label}</span>
    </div>
  )
}

function HomePage() {
  const [profile,          setProfile]          = useState(null)
  const [playlists,        setPlaylists]        = useState([])
  const [selectedPlaylist, setSelectedPlaylist] = useState(null)
  const [profileLoading,   setProfileLoading]   = useState(true)
  const [playlistsLoading, setPlaylistsLoading] = useState(true)
  const [error,            setError]            = useState(null)
  const [query,            setQuery]            = useState('')
  const [showSaved,        setShowSaved]        = useState(false)

  useEffect(() => {
    spotifyFetch('/api/spotify/me')
      .then(setProfile)
      .catch(e => setError(e.message))
      .finally(() => setProfileLoading(false))
  }, [])

  useEffect(() => {
    const PAGE = 50
    let cancelled = false

    async function fetchAll() {
      let offset = 0, total = Infinity
      while (offset < total) {
        const data = await spotifyFetch(`/api/spotify/playlists?limit=${PAGE}&offset=${offset}`)
        if (cancelled) return
        setPlaylists(prev => [...prev, ...data.items])
        total  = data.total
        offset += PAGE
        if (offset >= total) break
      }
      setPlaylistsLoading(false)
    }

    fetchAll().catch(e => {
      if (!cancelled) { setError(e.message); setPlaylistsLoading(false) }
    })

    return () => { cancelled = true }
  }, [])

  function handleLogout() {
    logout()
    window.location.href = '/'
  }

  const lq            = query.toLowerCase()
  // Before profile loads, show all playlists as "mine" so the grid isn't empty
  const myPlaylists    = playlists.filter(pl => !profile || pl.owner_id === profile.id)
  const savedPlaylists = profile ? playlists.filter(pl => pl.owner_id !== profile.id) : []
  const filteredMine   = myPlaylists.filter(pl => pl.name.toLowerCase().includes(lq))
  const filteredSaved  = savedPlaylists.filter(pl => pl.name.toLowerCase().includes(lq))

  return (
    <div className="home-page">

      <header className="home-header">
        <div className="home-logo">Price Your Playlist</div>
        {profile && (
          <div className="home-header-right">
            {profile.images?.[0]?.url
              ? <img className="home-avatar" src={profile.images[0].url} alt={profile.display_name} />
              : <div className="home-avatar home-avatar--placeholder">{profile.display_name?.[0]}</div>
            }
            <button className="home-logout" onClick={handleLogout}>Log out</button>
          </div>
        )}
      </header>

      {error && <div className="home-error">{error}</div>}
      {profileLoading && <LoadingPulse label="Fetching profile…" />}

      {profile && !selectedPlaylist && (
        <section className="home-profile">
          <div className="home-name">{profile.display_name}</div>
          <div className="home-profile-meta">
            <span>
              <span className="home-meta-label">Followers </span>
              <span className="home-meta-value">{(profile.followers ?? 0).toLocaleString()}</span>
            </span>
            {!playlistsLoading && (
              <span>
                <span className="home-meta-label">Playlists </span>
                <span className="home-meta-value">{myPlaylists.length}</span>
              </span>
            )}
            {profile.product === 'premium' && (
              <span className="home-meta-value home-meta-value--premium">Premium</span>
            )}
          </div>
        </section>
      )}

      {!selectedPlaylist ? (
        <section>
          <div className="home-section-top">
            <div className="home-section-heading">
              Your Playlists
              {!playlistsLoading && (
                <span className="home-section-count">{myPlaylists.length} total</span>
              )}
            </div>
            <input
              className="home-search"
              type="search"
              placeholder="Filter playlists…"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>

          {playlistsLoading && playlists.length === 0 ? (
            <div className="home-playlist-grid">
              {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : (
            <div className="home-playlist-grid">
              {filteredMine.map((pl, i) => (
                <PlaylistCard key={pl.id} pl={pl} index={i} onClick={setSelectedPlaylist} />
              ))}
            </div>
          )}

          {playlistsLoading && playlists.length > 0 && (
            <LoadingPulse label="Loading more…" />
          )}

          {!playlistsLoading && filteredSaved.length > 0 && (
            <div className="home-saved-section">
              <button
                className="home-saved-toggle"
                onClick={() => setShowSaved(s => !s)}
              >
                {showSaved ? '▾' : '▸'} Also saved ({filteredSaved.length})
              </button>
              {showSaved && (
                <div className="home-playlist-grid">
                  {filteredSaved.map((pl) => (
                    <div key={pl.id} className="home-playlist-card home-playlist-card--saved">
                      {pl.image_url
                        ? <img className="home-playlist-card__image" src={pl.image_url} alt={pl.name} />
                        : <div className="home-playlist-card__placeholder">♪</div>
                      }
                      <div className="home-playlist-card__name">{pl.name}</div>
                      <div className="home-playlist-card__meta">{pl.track_count} tracks · {pl.owner}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      ) : (
        <PlaylistDetail
          playlist={selectedPlaylist}
          onBack={() => setSelectedPlaylist(null)}
        />
      )}

    </div>
  )
}

export default HomePage
