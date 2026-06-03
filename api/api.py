import os
import re
import requests
import time
import logging
from collections import Counter
from functools import wraps, lru_cache
from concurrent.futures import ThreadPoolExecutor, as_completed
from flask import Flask, jsonify, request, abort
from flask_cors import CORS

app = Flask(__name__)
logging.basicConfig(level=logging.DEBUG, format="%(levelname)s  %(message)s")

CORS(app, origins=[os.environ.get("FRONTEND_URL", "http://localhost:5173")])

SPOTIFY_API_BASE = "https://api.spotify.com/v1"

DISCOGS_TOKEN = os.getenv("DISCOGS_TOKEN")
if not DISCOGS_TOKEN:
    app.logger.warning("DISCOGS_TOKEN not set — Discogs pricing will be skipped")
headers = {
    "Authorization": f"Discogs token={DISCOGS_TOKEN}",
    "User-Agent": "PriceYourPlaylist/1.0"
}

def get_spotify_token() -> str | None:
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        return auth_header[len("Bearer "):]
    return None

def spotify_get(path: str, params: dict = None) -> dict:
    token = get_spotify_token()
    if not token:
        abort(401, description="Missing Spotify access token.")

    url = f"{SPOTIFY_API_BASE}{path}"
    spotify_headers = {"Authorization": f"Bearer {token}"}

    response = requests.get(url, headers=spotify_headers, params=params, timeout=10)

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
    @wraps(f)
    def decorated(*args, **kwargs):
        if not get_spotify_token():
            return jsonify({"error": "Authorization header with Bearer token required."}), 401
        return f(*args, **kwargs)
    return decorated

def normalize_title_for_search(title: str) -> str:
    if not title:
        return title
    return re.sub(r"\s*\((?:feat|featuring|ft|feat|with\.)\s+[^)]*\)", "", title, flags=re.IGNORECASE).strip()

def get_amazon_link(artist: str, album: str, track: str) -> str | None:
    query = " ".join(p for p in [track, artist, album] if p)
    return f"https://www.amazon.com/s?k={requests.utils.quote(query)}&i=digital-music"

@lru_cache(maxsize=500)
def get_discogs_price(artist: str, title: str, album: str = None, media_format: str = None) -> dict | None:
    search_url = "https://api.discogs.com/database/search"
    normalized_title = normalize_title_for_search(title)
    query_parts = [p for p in (artist, normalized_title, album) if p]
    
    search_params = {
        "q": " ".join(query_parts),
        "type": "release",
    }
    
    if media_format:
        search_params["format"] = media_format
    
    amazon_link = get_amazon_link(artist, album, normalized_title)

    try:
        search_response = requests.get(search_url, params=search_params, headers=headers, timeout=10)
    except requests.exceptions.RequestException as e:
        app.logger.warning("Discogs search network error for '%s': %s", title, e)
        return {"found": False, "link": amazon_link}

    if search_response.status_code == 401:
        app.logger.error("Discogs token is invalid or missing (401)")
        return {"found": False, "link": amazon_link}
    if search_response.status_code == 429:
        app.logger.warning("Discogs rate limit hit searching '%s'", title)
        return {"found": False, "link": amazon_link}
    if not search_response.ok:
        app.logger.warning("Discogs search returned %d for '%s'", search_response.status_code, title)
        return {"found": False, "link": amazon_link}

    results = [r for r in search_response.json().get("results", []) if r.get("type") == "release"]

    if not results:
        return {"found": False, "link": amazon_link}

    for result in results[:2]:
        if result.get('type') != 'release':
            continue
            
        release_id = result['id']
        time.sleep(1) 
        
        try:
            price_response = requests.get(
                f"https://api.discogs.com/releases/{release_id}",
                headers=headers,
                timeout=10,
            )
            price_response.raise_for_status()
        except requests.exceptions.RequestException as e:
            app.logger.warning("Discogs release fetch error for id %s: %s", release_id, e)
            continue

        lowest_price = price_response.json().get("lowest_price")
        if lowest_price:
            return {
                "found": True,
                "version": result["title"],
                "price": lowest_price,
                "link": f"https://www.discogs.com/sell/release/{release_id}",
            }

    first = results[0]
    return {
        "found": True,
        "price": None,
        "link": f"https://www.discogs.com/release/{first['id']}",
    }


@lru_cache(maxsize=200)
def get_discogs_album_price(artist: str, album: str, media_format: str = None) -> dict | None:
    amazon_link = get_amazon_link(artist, album, "")

    try:
        search_response = requests.get(
            "https://api.discogs.com/database/search",
            params={"q": f"{artist} {album}", "type": "master"},
            headers=headers,
            timeout=10,
        )
    except requests.exceptions.RequestException as e:
        app.logger.warning("Discogs master search network error for '%s - %s': %s", artist, album, e)
        return {"found": False, "link": amazon_link}

    if search_response.status_code == 401:
        app.logger.error("Discogs token invalid (401)")
        return {"found": False, "link": amazon_link}
    if search_response.status_code == 429:
        app.logger.warning("Discogs rate limit hit searching master '%s'", album)
        return {"found": False, "link": amazon_link}
    if not search_response.ok:
        return {"found": False, "link": amazon_link}

    masters = search_response.json().get("results", [])
    if not masters:
        return {"found": False, "link": amazon_link}

    master = masters[0]
    master_id = master["id"]
    master_link = f"https://www.discogs.com/master/{master_id}"

    time.sleep(1)
    versions_params = {"per_page": 10, "page": 1, "sort": "price", "sort_order": "asc"}
    if media_format:
        versions_params["format"] = media_format

    try:
        versions_response = requests.get(
            f"https://api.discogs.com/masters/{master_id}/versions",
            headers=headers,
            params=versions_params,
            timeout=10,
        )
        versions_response.raise_for_status()
    except requests.exceptions.RequestException as e:
        app.logger.warning("Discogs versions fetch error for master %s: %s", master_id, e)
        return {"found": True, "price": None, "link": master_link}

    versions = versions_response.json().get("versions", [])
    if not versions:
        return {"found": True, "price": None, "link": master_link}

    for version in versions[:5]:
        release_id = version.get("id")
        if not release_id:
            continue
        time.sleep(1)
        try:
            price_response = requests.get(
                f"https://api.discogs.com/releases/{release_id}",
                headers=headers,
                timeout=10,
            )
            price_response.raise_for_status()
        except requests.exceptions.RequestException as e:
            app.logger.warning("Discogs release fetch error for version %s: %s", release_id, e)
            continue

        lowest_price = price_response.json().get("lowest_price")
        if lowest_price:
            return {
                "found": True,
                "price": lowest_price,
                "link": f"https://www.discogs.com/sell/release/{release_id}",
                "master_link": master_link,
            }

    return {"found": True, "price": None, "link": master_link}


@app.route("/api/spotify/me")
@require_token
def get_profile():
    data = spotify_get("/me")
    app.logger.info("Profile fetched for user '%s'", data.get("id"))
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
    limit  = min(int(request.args.get("limit",  20)), 50)
    offset = int(request.args.get("offset", 0))
    app.logger.debug("GET /api/spotify/playlists  limit=%d offset=%d", limit, offset)
    data = spotify_get("/me/playlists", params={"limit": limit, "offset": offset})
    items = []
    for pl in data.get("items", []):
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
    return jsonify({"total": data.get("total", 0), "items": items})

@app.route("/api/spotify/playlists/<playlist_id>/tracks")
@require_token
def get_playlist_tracks(playlist_id: str):
    playlist_info = spotify_get(f"/playlists/{playlist_id}", params={"fields": "owner(id)"})
    owner_id = playlist_info.get("owner", {}).get("id")
    current_user = spotify_get("/me", params={"fields": "id"})
    current_user_id = current_user.get("id")
    
    if owner_id != current_user_id:
        abort(403, description="You can only fetch tracks from your own playlists.")
    
    requested_format = request.args.get("format")
    all_tracks = []
    offset = 0
    limit  = 100
    total  = None

    while True:
        data = spotify_get(
            f"/playlists/{playlist_id}/items",
            params={"limit": limit, "offset": offset, "fields": "total,next,items(item(id,name,duration_ms,artists(name),album(name,images)))"},
        )
        if total is None: total = data.get("total", 0)
        for item in data.get("items", []):
            track = item.get("item")
            if not track: continue
            
            album = track.get("album", {})
            album_images = album.get("images", [])
            album_image = album_images[0].get("url") if album_images else None
            
            track_data = {
                "id":          track.get("id"),
                "name":        track.get("name"),
                "artists":     [a["name"] for a in track.get("artists", [])],
                "album":       album.get("name"),
                "album_image": album_image,
                "duration_ms": track.get("duration_ms"),
            }
            all_tracks.append(track_data)
        offset += limit
        if not data.get("next"): break

    album_track_counts = Counter(
        t["album"] for t in all_tracks if t.get("album")
    )
    multi_track_albums = {album for album, count in album_track_counts.items() if count >= 2}

    def fetch_price(track_data):
        artist = track_data["artists"][0] if track_data["artists"] else ""
        return track_data, get_discogs_price(artist, track_data["name"], track_data.get("album"), requested_format)

    def fetch_album_price(album: str, artist: str):
        return album, get_discogs_album_price(artist, album, requested_format)

    solo_tracks = [t for t in all_tracks if t.get("album") not in multi_track_albums]

    album_artist_map = {}
    for t in all_tracks:
        album = t.get("album")
        if album and album in multi_track_albums and album not in album_artist_map:
            album_artist_map[album] = t["artists"][0] if t["artists"] else ""

    with ThreadPoolExecutor(max_workers=20) as executor:
        track_futures = {executor.submit(fetch_price, t): t for t in solo_tracks}
        album_futures = {
            executor.submit(fetch_album_price, album, artist): album
            for album, artist in album_artist_map.items()
        }

        priced = {}
        for future in as_completed(track_futures):
            track_data, price = future.result()
            track_data["price"] = price
            priced[track_data["id"]] = track_data

        album_prices = {}
        for future in as_completed(album_futures):
            album_name, album_price = future.result()
            album_prices[album_name] = album_price

    for t in all_tracks:
        if t["id"] not in priced:
            t["price"] = None
            priced[t["id"]] = t

    for track_data in priced.values():
        album = track_data.get("album")
        track_data["album_price"] = album_prices.get(album) if album in multi_track_albums else None

    all_tracks = [priced[t["id"]] for t in all_tracks if t["id"] in priced]
    return jsonify({"playlist_id": playlist_id, "tracks": all_tracks})

if __name__ == "__main__":
    app.run(debug=os.environ.get("FLASK_DEBUG", "true").lower() == "true")