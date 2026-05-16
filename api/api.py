import os
import requests
from functools import wraps
from flask import Flask, jsonify, request, abort
from flask_cors import CORS

# Initialize Flask app
app = Flask(__name__)

# Configure CORS with frontend URL from environment or default to localhost
CORS(app, origins=[os.environ.get("FRONTEND_URL", "http://localhost:5173")])

# Spotify API base URL
SPOTIFY_API_BASE = "https://api.spotify.com/v1"

# Discogs API configuration
DISCOGS_TOKEN = os.getenv("DISCOGS_TOKEN")
headers = {
    "Authorization": f"Discogs token={DISCOGS_TOKEN}",
    "User-Agent": "PriceYourPlaylist/1.0"
}

def get_spotify_token() -> str | None:
    """Extract the Spotify OAuth access token from the incoming request.

    Looks for an `Authorization` header in the form ``Bearer <token>``.
    Returns the token string when present, otherwise returns ``None``.
    """
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        return auth_header[len("Bearer "):]
    return None

def spotify_get(path: str, params: dict = None) -> dict:
    """Perform a GET against the Spotify Web API and return parsed JSON.

    - Extracts the Bearer token from the incoming HTTP request and uses it
      to authenticate to Spotify.
    - Aborts for common error conditions so the frontend receives a clear, 
      JSON-formatted error.
    - On success returns the decoded JSON response from Spotify.
    """
    token = get_spotify_token()
    if not token:
        abort(401, description="Missing Spotify access token.")

    url = f"{SPOTIFY_API_BASE}{path}"
    headers = {"Authorization": f"Bearer {token}"}

    response = requests.get(url, headers=headers, params=params, timeout=10)

    if response.status_code == 401:
        abort(401, description="Spotify token invalid or expired.")

    if response.status_code == 403:
        abort(403, description="Spotify token lacks required scopes.")

    if response.status_code == 429:
        retry_after = response.headers.get("Retry-After", "1")
        abort(429, description=f"Spotify rate limit hit. Retry after {retry_after}s.")

    if not response.ok:
        abort(502, description=f"Spotify API error {response.status_code}: {response.text[:200]}")

    return response.json()

def require_token(f):
    """Decorator ensuring the incoming request contains a Spotify token.

    If no Bearer token is present the decorator returns a JSON error with
    HTTP 401. Otherwise the wrapped view is executed normally.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        if not get_spotify_token():
            return jsonify({"error": "Authorization header with Bearer token required."}), 401
        return f(*args, **kwargs)
    return decorated

def get_discogs_price(artist: str, title: str, album: str = None) -> dict | None:
    """Query the Discogs database for likely release matches and return a price.

    - Builds a search query from `artist`, `title`, and optionally `album` to
      improve matching accuracy.
    - Searches the Discogs database and inspects up to the first 5 release
      results. For each release it requests release details and returns the
      `lowest_price` when available along with a link to the Discogs marketplace.
    - Returns a dict: ``{"version": <title>, "price": <lowest_price>, "link": <url>}``
      or ``None`` on network errors or if no priced release is found.
    - Requires a valid `DISCOGS_TOKEN` set in the environment; requests use
      the module-level `headers` configured at import time.
    """
    search_url = "https://api.discogs.com/database/search"
    # Include album, artist and song title in the search to improve matching
    query_parts = [p for p in (artist, title, album) if p]
    search_query = " ".join(query_parts)
    search_params = {
        "q": search_query,
        "type": "release",
    }
    
    try:
        search_response = requests.get(search_url, params=search_params, headers=headers, timeout=10)
        search_response.raise_for_status()
        data = search_response.json()
    except requests.exceptions.RequestException:
        return None

    results = data.get('results', [])
    
    if not results:
        return None

    for result in results[:5]:
        if result.get('type') != 'release':
            continue
            
        release_id = result['id']
        price_url = f"https://api.discogs.com/releases/{release_id}"
        
        try:
            price_response = requests.get(price_url, headers=headers, timeout=10)
            price_data = price_response.json()
            lowest_price = price_data.get('lowest_price')
            
            if lowest_price:
                market_link = f"https://www.discogs.com/sell/release/{release_id}"
                return {
                    "version": result['title'],
                    "price": lowest_price,
                    "link": market_link
                }
        except requests.exceptions.RequestException:
            continue
                
    return None

@app.route("/api/spotify/me")
@require_token
def get_profile():
    """Return a simplified profile object for the authenticated Spotify user.

    Uses the Spotify `/me` endpoint and normalizes commonly used fields so the
    frontend does not need to parse Spotify's full profile object.
    """
    data = spotify_get("/me")
    return jsonify({
        "id":           data.get("id"),
        "display_name": data.get("display_name"),
        "email":        data.get("email"),
        "images":       data.get("images", []),
        "followers":    data.get("followers", {}).get("total", 0),
        "country":      data.get("country"),
        "product":      data.get("product"),
    })

@app.route("/api/spotify/playlists")
@require_token
def get_playlists():
    """Return the authenticated user's playlists

    Query parameters:
    - `limit`: number of playlists to return (default 20, max 50)
    - `offset`: pagination offset

    Note: handles Spotify's historical change where playlist track info was
    sometimes under `tracks` and later under `items`.
    """
    limit  = min(int(request.args.get("limit",  20)), 50)
    offset = int(request.args.get("offset", 0))

    data = spotify_get("/me/playlists", params={"limit": limit, "offset": offset})

    items = []
    for pl in data.get("items", []):
        # Spotify changed 'tracks' to 'items' in Feb 2026
        track_info = pl.get("items") or pl.get("tracks") or {}
        items.append({
            "id":            pl.get("id"),
            "name":          pl.get("name"),
            "track_count":   track_info.get("total", 0),
            "public":        pl.get("public"),
            "collaborative": pl.get("collaborative"),
            "image_url":     pl.get("images", [{}])[0].get("url") if pl.get("images") else None,
            "owner":         pl.get("owner", {}).get("display_name") or pl.get("owner", {}).get("id"),
            "owner_id":      pl.get("owner", {}).get("id"),
        })

    return jsonify({
        "total":  data.get("total", 0),
        "limit":  data.get("limit", limit),
        "offset": data.get("offset", offset),
        "items":  items,
    })

@app.route("/api/spotify/playlists/<playlist_id>/tracks")
@require_token
def get_playlist_tracks(playlist_id: str):
    """Return detailed track list for a playlist, including Discogs prices.

    - Confirms the requesting user owns the playlist and aborts with 403 if not.
    - Pages through Spotify playlist items (100 per page) until exhausted.
    - Skips deleted/null tracks returned by Spotify.
    - For each valid track the handler queries Discogs via ``get_discogs_price``
      and embeds the result under the `price` key (may be ``None``).
    """
    # First, get playlist info to check if current user owns it
    playlist_info = spotify_get(f"/playlists/{playlist_id}", params={"fields": "owner(id)"})
    owner_id = playlist_info.get("owner", {}).get("id")
    
    # Get current user's ID
    current_user = spotify_get("/me", params={"fields": "id"})
    current_user_id = current_user.get("id")
    
    # Spotify Feb 2026: only return items for user's own playlists
    if owner_id != current_user_id:
        abort(403, description="You can only fetch tracks from your own playlists. This playlist is owned by another user.")
    
    all_tracks = []
    offset = 0
    limit  = 100
    total  = None

    while True:
        data = spotify_get(
            f"/playlists/{playlist_id}/items",
            params={
                "limit":  limit,
                "offset": offset,
                "fields": (
                    "total,next,items(added_at,"
                    "item(id,name,explicit,duration_ms,preview_url,"
                    "artists(name),album(name,release_date)))"
                ),
            },
        )

        if total is None:
            total = data.get("total", 0)

        for item in data.get("items", []):
            track = item.get("item")
            if not track:
                continue   # Spotify can return null tracks (deleted songs)
            track_data = {
                "id":          track.get("id"),
                "name":        track.get("name"),
                "artists":     [a["name"] for a in track.get("artists", [])],
                "album":       track.get("album", {}).get("name"),
                "duration_ms": track.get("duration_ms"),
            }
            artist = track_data["artists"][0] if track_data["artists"] else ""
            track_title = track_data["name"]
            price = get_discogs_price(artist, track_title, track_data.get("album"))
            track_data["price"] = price
            all_tracks.append(track_data)

        offset += limit
        if not data.get("next"):   # Spotify sets "next" to null on last page
            break

    return jsonify({
        "playlist_id":   playlist_id,
        "total_tracks":  total,
        "tracks":        all_tracks,
    })


#Error Handling
@app.errorhandler(401)
def unauthorized(e):
    return jsonify({"error": str(e.description)}), 401

@app.errorhandler(403)
def forbidden(e):
    return jsonify({"error": str(e.description)}), 403

@app.errorhandler(429)
def rate_limited(e):
    return jsonify({"error": str(e.description)}), 429

@app.errorhandler(502)
def bad_gateway(e):
    return jsonify({"error": str(e.description)}), 502

if __name__ == "__main__":
    app.run(debug=os.environ.get("FLASK_DEBUG", "true").lower() == "true")

