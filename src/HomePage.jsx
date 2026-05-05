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


function TrackRow({ track, index }) {
  const [open, setOpen] = useState(false)

  return (
    <div
      className="home-track-row"
      style={{ animationDelay: `${Math.min(index * 30, 600)}ms` }}
    >
      <div>
        <span className="home-track-row__index">{index + 1}</span>
        <div>
          <div className="home-track-row__name">{track.name}</div>
          <div className="home-track-row__artist">{(track.artists || []).join(', ')}</div>
        </div>
      </div>
    </div>
  )
}

function PlaylistCard({ pl, onClick, index, isOwnPlaylist }) {
  return (
    <div
      className="home-playlist-card"
      style={{ animationDelay: `${Math.min(index * 40, 800)}ms` }}
      onClick={() => isOwnPlaylist && onClick(pl)}
    >
      {pl.image_url
        ? <img className="home-playlist-card__image" src={pl.image_url} alt={pl.name} />
        : <div className="home-playlist-card__placeholder"></div>
      }
      <div className="home-playlist-card__name">{pl.name}</div>
      <div className="home-playlist-card__meta">{pl.track_count} tracks</div>
      <div className={`home-playlist-card__cta${!isOwnPlaylist ? ' home-playlist-card__cta--disabled' : ''}`}>
        {isOwnPlaylist ? 'Analyse' : 'Not your playlist'}
      </div>
    </div>
  )
}

function PlaylistDetail({ playlist, onBack }) {
  const [tracks,   setTracks]   = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)

  useEffect(() => {
    if (!playlist) return
    setLoading(true)
    setTracks(null)
    setError(null)

    spotifyFetch(`/api/spotify/playlists/${playlist.id}/tracks`)
      .then(async data => {
        setTracks(data.tracks)

        const ids = data.tracks.map(t => t.id).filter(Boolean)
        const batches = []
        for (let i = 0; i < ids.length; i += 100) batches.push(ids.slice(i, i + 100))
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [playlist])

  const hasStats = false

  return (
    <div className="home-detail">
      <button className="home-back-btn" onClick={onBack}>← Back to playlists</button>

      <div className="home-detail-header">
        {playlist.image_url
          ? <img className="home-detail-cover" src={playlist.image_url} alt={playlist.name} />
          : <div className="home-detail-cover--placeholder">♪</div>
        }
        <div>
          <div className="home-detail-title">{playlist.name}</div>
          <div className="home-detail-meta">
            by {playlist.owner} · {playlist.track_count} tracks
            {playlist.public === false &&
              <span className="home-detail-badge home-detail-badge--private"> PRIVATE</span>}
            {playlist.collaborative &&
              <span className="home-detail-badge home-detail-badge--collab"> COLLAB</span>}
          </div>
        </div>
      </div>

      {loading && <LoadingPulse label="Loading tracks & audio data…" />}
      {tracks  && (
        <div>
          {tracks.map((track, i) => (
            <TrackRow key={track.id ?? i} track={track} index={i} />
          ))}
        </div>
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

      {profileLoading && <LoadingPulse label="Fetching profile…" />}
      {profile && (
        <section className="home-profile">
          {profile.images?.[0]?.url
            ? <img className="home-profile-avatar" src={profile.images[0].url} alt={profile.display_name} />
            : <div className="home-profile-avatar--placeholder">{profile.display_name?.[0]}</div>
          }
          <div>
            <div className="home-name">{profile.display_name}</div>
          </div>
        </section>
      )}

      {!selectedPlaylist ? (
        <section>
          <div className="home-section-heading">
            Your Playlists
            {!playlistsLoading && (
              <span className="home-section-count">{playlists.length} total</span>
            )}
          </div>

          {playlistsLoading && playlists.length === 0 && (
            <LoadingPulse label="Loading playlists…" />
          )}

          <div className="home-playlist-grid">
            {playlists.map((pl, i) => (
              <PlaylistCard 
                key={pl.id} 
                pl={pl} 
                index={i} 
                onClick={setSelectedPlaylist} 
                isOwnPlaylist={profile?.id === pl.owner_id}
              />
            ))}
          </div>

          {playlistsLoading && playlists.length > 0 && (
            <LoadingPulse label="Loading more…" />
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
