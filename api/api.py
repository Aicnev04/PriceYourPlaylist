import os
import requests
from functools import wraps
from flask import Flask, jsonify, request, abort
from flask_cors import CORS

app = Flask(__name__)

CORS(app, origins=[os.environ.get("FRONTEND_URL", "http://localhost:5173")])

SPOTIFY_API_BASE = "https://api.spotify.com/v1"

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
    @wraps(f)
    def decorated(*args, **kwargs):
        if not get_spotify_token():
            return jsonify({"error": "Authorization header with Bearer token required."}), 401
        return f(*args, **kwargs)
    return decorated


@app.route("/api/spotify/me")
@require_token
def get_profile():
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
    limit  = min(int(request.args.get("limit",  20)), 50)
    offset = int(request.args.get("offset", 0))

    data = spotify_get("/me/playlists", params={"limit": limit, "offset": offset})

    items = []
    for pl in data.get("items", []):
        items.append({
            "id":            pl.get("id"),
            "name":          pl.get("name"),
            "track_count":   pl.get("tracks", {}).get("total", 0),
            "public":        pl.get("public"),
            "collaborative": pl.get("collaborative"),
            "image_url":     pl.get("images", [{}])[0].get("url") if pl.get("images") else None,
            "owner":         pl.get("owner", {}).get("display_name") or pl.get("owner", {}).get("id"),
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
    all_tracks = []
    offset = 0
    limit  = 100
    total  = None

    while True:
        data = spotify_get(
            f"/playlists/{playlist_id}/tracks",
            params={
                "limit":  limit,
                "offset": offset,
                "fields": (
                    "total,next,items(added_at,"
                    "track(id,name,explicit,duration_ms,preview_url,"
                    "artists(name),album(name,release_date)))"
                ),
            },
        )

        if total is None:
            total = data.get("total", 0)

        for item in data.get("items", []):
            track = item.get("track")
            if not track:
                continue   # Spotify can return null tracks (deleted songs)
            all_tracks.append({
                "id":          track.get("id"),
                "name":        track.get("name"),
                "artists":     [a["name"] for a in track.get("artists", [])],
                "album":       track.get("album", {}).get("name"),
            })

        offset += limit
        if not data.get("next"):   # Spotify sets "next" to null on last page
            break

    return jsonify({
        "playlist_id":   playlist_id,
        "total_tracks":  total,
        "tracks":        all_tracks,
    })

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
    app.run(debug=os.environ.get("FLASK_DEBUG", "false").lower() == "true")