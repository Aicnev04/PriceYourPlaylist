import { useState } from 'react'

// pulls the backend URL from .env, falls back to same origin if not set
const API = import.meta.env.VITE_API_URL || ''

// the three formats we check on Discogs for every search
const FORMATS = ['Vinyl', 'CD', 'Cassette']

export default function AlbumSearch() {
  const [artist,  setArtist]  = useState('')
  const [album,   setAlbum]   = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  async function handleSearch() {
    // don't search if either field is empty
    if (!artist.trim() || !album.trim()) return

    setLoading(true)
    setResults(null)
    setError(null)

    try {
      // hit the backend once per format at the same time instead of one by one
      const fetches = FORMATS.map(fmt =>
        fetch(`${API}/api/discogs/search?artist=${encodeURIComponent(artist)}&album=${encodeURIComponent(album)}&format=${fmt}`)
          .then(r => r.json())
          .then(d => ({ ...d, format: fmt })) // attach the format name to the result
      )

      // wait for all three to come back
      const data = await Promise.all(fetches)
      setResults(data)
    } catch (e) {
      setError(e.message)
    }

    setLoading(false)
  }

  return (
    <div className="home-detail" style={{ marginTop: '48px' }}>

      <div className="home-section-heading" style={{ marginBottom: '16px' }}>
        Album Price Search
      </div>

      {/* two inputs side by side — artist and album title */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <input
          className="home-search"
          style={{ width: '200px' }}
          placeholder="Artist name…"
          value={artist}
          onChange={e => setArtist(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
        />
        <input
          className="home-search"
          style={{ width: '200px' }}
          placeholder="Album title…"
          value={album}
          onChange={e => setAlbum(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
        />
        <button className="home-logout" onClick={handleSearch}>
          Search
        </button>
      </div>

      {/* show error if the request fails */}
      {error && <div className="home-error">{error}</div>}

      {/* spinner while waiting for Discogs to respond */}
      {loading && (
        <div className="home-loading">
          <div className="home-loading__dot" />
          <span className="home-loading__label">Searching Discogs…</span>
        </div>
      )}

      {/* one row per format showing the lowest price and a buy link */}
      {results && results.map(r => (
        <div key={r.format} className="home-track-row">
          <div className="home-track-row__inner">

            {/* empty index cell to keep columns lined up with the track list */}
            <div className="home-track-row__index" />

            {/* no album art here since this is a manual search */}
            <div className="home-track-row__thumb home-track-row__thumb--placeholder" />

            {/* release title from Discogs, falls back to what the user typed */}
            <div>
              <div className="home-track-row__name">{r.version || album}</div>
              <div className="home-track-row__artist">{r.format}</div>
            </div>

            {/* duration doesn't apply here, just keeping the grid consistent */}
            <div className="home-track-row__duration" />

            {/* lowest price on Discogs, dash if nothing is listed */}
            <div className="home-track-row__price-amount">
              {r.price != null ? `$${Number(r.price).toFixed(2)}` : '—'}
            </div>

            {/* links to the Discogs listing, or Amazon if nothing was found */}
            <div className="home-track-row__buy">
              {r.link && (
                <a
                  className="home-track-row__buy-btn"
                  href={r.link}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {r.price != null ? 'Buy' : 'Link'}
                </a>
              )}
            </div>

          </div>
        </div>
      ))}

    </div>
  )
}
