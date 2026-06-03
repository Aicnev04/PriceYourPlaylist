import { useEffect, useState, useRef} from 'react'
import { getAccessToken, logout } from './spotify-auth'
import './HomePage.css'
// Added AlbumSearch so users can look up any album price without needing a playlist
import AlbumSearch from './AlbumSearch'

const API = import.meta.env.VITE_API_URL || ''

// Helper to make authenticated requests to our Flask backend using the Spotify token
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

// Placeholder card shown while playlists are loading
function SkeletonCard() {
  return (
    <div className="home-playlist-card home-playlist-card--skeleton">
      <div className="skeleton skeleton--image" />
      <div className="skeleton skeleton--title" />
      <div className="skeleton skeleton--meta" />
    </div>
  )
}

// Placeholder row shown while tracks are loading
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

// Converts milliseconds to m:ss format (e.g. 213000 -> 3:33)
function formatDuration(ms) {
  if (!ms) return '0:00'
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

// Buy/Link button that opens the Discogs listing in a new tab
function BuyButton({ price, label }) {
  if (!price?.link) return null
  return (
    <a
      className="home-track-row__buy-btn"
      href={price.link}
      target="_blank"
      rel="noopener noreferrer"
    >
      {label ?? (price.price != null ? 'Buy' : 'Link')}
    </a>
  )
}

// Single track row showing track name, artist, duration, price, and buy link
function TrackRow({ track, index }) {
  const price = track.price
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
          {price?.price != null ? `$${Number(price.price).toFixed(2)}` : ''}
        </div>
        <div className="home-track-row__buy">
          <BuyButton price={price} />
        </div>
      </div>
    </div>
  )
}

// Groups tracks from the same album together so users can choose to buy
// tracks individually or the whole album at once
function AlbumGroup({ albumName, tracks, startIndex }) {
  const [buyMode, setBuyMode] = useState('individual')
  const albumPrice = tracks[0]?.album_price
  const hasAlbumPrice = albumPrice?.price != null
  const hasAlbumLink  = Boolean(albumPrice?.link)
  const totalIndividual = tracks.reduce((sum, t) => sum + (t.price?.price ?? 0), 0)

  return (
    <div className="home-album-group">
      <div className="home-album-group__header">
        <div />
        {tracks[0]?.album_image
          ? <img className="home-track-row__thumb" src={tracks[0].album_image} alt={albumName} />
          : <div className="home-track-row__thumb home-track-row__thumb--placeholder" />
        }
        <div style={{ minWidth: 0 }}>
          <div className="home-album-group__name">{albumName}</div>
          <div className="home-album-group__artist">{(tracks[0]?.artists || []).join(', ')}</div>
        </div>
        <div className="home-album-group__actions">
          {/* Toggle between buying tracks individually or the whole album */}
          <div className="home-album-toggle">
            <button
              className={`home-album-toggle__btn${buyMode === 'individual' ? ' home-album-toggle__btn--active' : ''}`}
              onClick={() => setBuyMode('individual')}
            >
              Individual{totalIndividual > 0 && ` $${totalIndividual.toFixed(2)}`}
            </button>
            <button
              className={`home-album-toggle__btn${buyMode === 'album' ? ' home-album-toggle__btn--active' : ''}`}
              onClick={() => setBuyMode('album')}
              disabled={!hasAlbumLink}
            >
              Album{hasAlbumPrice && ` $${Number(albumPrice.price).toFixed(2)}`}
            </button>
          </div>
          {buyMode === 'album' && hasAlbumLink && (
            <BuyButton price={albumPrice} label={hasAlbumPrice ? 'Buy Album' : 'View Album'} />
          )}
        </div>
      </div>

      {/* Collapse the track list when album mode is selected */}
      <div className={`home-album-tracks${buyMode === 'album' ? ' home-album-tracks--collapsed' : ''}`}>
        <div className="home-album-tracks__inner">
          {tracks.map((track, i) => (
            <div key={track.id ?? i} className="home-track-row home-track-row--grouped">
              <div className="home-track-row__inner">
                <div className="home-track-row__index">{startIndex + i + 1}</div>
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
                  {track.price?.price != null ? `$${Number(track.price.price).toFixed(2)}` : ''}
                </div>
                <div className="home-track-row__buy">
                  <BuyButton price={track.price} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Clickable playlist card shown in the grid on the main page
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

// Shows all tracks in a playlist with their Discogs prices
// Re-fetches whenever the user switches the format filter (Vinyl, CD, etc.)
function PlaylistDetail({ playlist, onBack, trackCache }) {
  const [progress,    setProgress]    = useState(0)
  const [tracks,      setTracks]      = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState(null)
  const [totalPrice,  setTotalPrice]  = useState(0)
  const [pricedCount, setPricedCount] = useState(0)
  const [mediaFormat, setMediaFormat] = useState("")

  useEffect(() => {
    if (!playlist) return

    const cacheKey = `${playlist.id}-${mediaFormat}`

    if (trackCache.current[cacheKey]) {
      console.log('cache hit for', cacheKey)
      const cached = trackCache.current[cacheKey]
      setTracks(cached.tracks)
      setPricedCount(cached.pricedCount)
      setTotalPrice(cached.totalPrice)
      setLoading(false)
      return
    }


    setLoading(true)
    setTracks(null)
    setError(null)
    setTotalPrice(0)
    setPricedCount(0)

    setProgress(0)

    const trackCount = playlist.track_count || 20
    const intervalMs = Math.max(200, Math.min(600, trackCount * 10))

    const progressInterval = setInterval(() => {
      setProgress(p => {
        if (p >= 85) { clearInterval(progressInterval); return 85 }
        // slows down exponentially as it approaches 85
        const remaining = 85 - p
        const increment = remaining * 0.08
        return p + increment
      })
    }, intervalMs)

    // Add format to query string if one is selected
    const formatQuery = mediaFormat ? `?format=${mediaFormat}` : ""
    spotifyFetch(`/api/spotify/playlists/${playlist.id}/tracks${formatQuery}`)
      .then(data => {
        clearInterval(progressInterval)
        setProgress(100)
        const priced = data.tracks.filter(t => t.price?.price != null)
        const pricedCount = priced.length
        const totalPrice = priced.reduce((sum, t) => sum + parseFloat(t.price.price), 0)

        trackCache.current[cacheKey] = { tracks: data.tracks, pricedCount, totalPrice }
        setTracks(data.tracks)
        setPricedCount(pricedCount)
        setTotalPrice(totalPrice)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [playlist, mediaFormat])

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

          {/* Format filter buttons — changing this re-fetches prices for that format */}
          <div className="home-filter-container">
            <span className="home-meta-label">Format</span>
            <div className="home-format-toggle">
              {[['', 'All'], ['Vinyl', 'Vinyl'], ['CD', 'CD'], ['Cassette', 'Cassette']].map(([val, label]) => (
                <button
                  key={val}
                  className={`home-format-btn${mediaFormat === val ? ' home-format-btn--active' : ''}`}
                  onClick={() => setMediaFormat(val)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="home-detail-meta">
            by {playlist.owner} · {playlist.track_count} tracks
          </div>

          {/* Summary stats shown after tracks finish loading */}
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

      {loading && (
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px', opacity: 0.6 }}>
            <span>Fetching prices…</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div style={{ height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${progress}%`,
              background: 'var(--color-primary, #1db954)',
              borderRadius: '2px',
              transition: 'width 0.4s ease',
            }} />
          </div>
          {Array.from({ length: 8 }).map((_, i) => <SkeletonTrackRow key={i} />)}
        </div>
      )}

      {tracks && (() => {
        // Count how many tracks belong to each album
        const albumCounts = tracks.reduce((acc, t) => {
          if (t.album) acc[t.album] = (acc[t.album] || 0) + 1
          return acc
        }, {})

        // Build the track list, grouping albums that have 2+ tracks together
        const rows = []
        const renderedAlbums = new Set()
        let i = 0
        while (i < tracks.length) {
          const track = tracks[i]
          const album = track.album
          if (album && albumCounts[album] >= 2 && track.album_price !== undefined) {
            if (!renderedAlbums.has(album)) {
              renderedAlbums.add(album)
              const group = tracks.filter(t => t.album === album)
              rows.push(
                <AlbumGroup key={`album-${album}`} albumName={album} tracks={group} startIndex={i} />
              )
              i += group.length
            } else {
              i++
            }
          } else {
            rows.push(<TrackRow key={track.id ?? i} track={track} index={i} />)
            i++
          }
        }
        return (
          <>
            <div className="home-track-hint"># · Track · Duration · Price</div>
            {rows}
          </>
        )
      })()}
    </div>
  )
}

// Simple loading spinner with a label
function LoadingPulse({ label = 'Loading…' }) {
  return (
    <div className="home-loading">
      <div className="home-loading__dot" />
      <span className="home-loading__label">{label}</span>
    </div>
  )
}

// Main page component — shows the user's profile, playlist grid, and album search
function HomePage() {
  const trackCache = useRef({}) // locally cache recent discogs searches
  const [profile,          setProfile]          = useState(null)
  const [playlists,        setPlaylists]        = useState([])
  const [selectedPlaylist, setSelectedPlaylist] = useState(null)
  const [profileLoading,   setProfileLoading]   = useState(true)
  const [playlistsLoading, setPlaylistsLoading] = useState(true)
  const [error,            setError]            = useState(null)
  const [query,            setQuery]            = useState('')
  const [showSaved,        setShowSaved]        = useState(false)

  // Fetch the logged-in user's Spotify profile
  useEffect(() => {
    spotifyFetch('/api/spotify/me')
      .then(setProfile)
      .catch(e => setError(e.message))
      .finally(() => setProfileLoading(false))
  }, [])

  // Fetch all playlists in pages of 50
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

  // Split playlists into ones the user owns vs ones they saved from others
  const lq             = query.toLowerCase()
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
          trackCache = {trackCache}
        />
      )}

      {/* Album search bar added by Abner - lets users search any album on Discogs directly */}
      <AlbumSearch />
    </div>
  )
}

export default HomePage