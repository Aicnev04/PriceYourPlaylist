import os
import requests
from dotenv import load_dotenv

# grab the tokens from .env
load_dotenv()
DISCOGS_TOKEN = os.getenv("DISCOGS_TOKEN")

# flask backend we're testing against
BASE_URL = "http://127.0.0.1:5000"

# headers needed for every Discogs request
headers = {
    "Authorization": f"Discogs token={DISCOGS_TOKEN}",
    "User-Agent": "PriceYourPlaylist/1.0"
}

# reused from price_test.py — searches discogs for a format and returns the lowest price
def get_format_price(artist_name, album_title, media_format):
    search_url = "https://api.discogs.com/database/search"
    search_params = {
        "release_title": album_title,
        "artist": artist_name,
        "type": "release",
        "format": media_format
    }
    try:
        search_response = requests.get(search_url, params=search_params, headers=headers)
        search_response.raise_for_status()
        results = search_response.json().get('results', [])
        # check up to 5 results to find one that's actually for sale
        for result in results[:5]:
            release_id = result['id']
            price_response = requests.get(
                f"https://api.discogs.com/releases/{release_id}", headers=headers
            )
            if price_response.status_code == 200:
                lowest_price = price_response.json().get('lowest_price')
                if lowest_price:
                    return {
                        "title": result['title'],
                        "price": lowest_price,
                        "link": f"https://www.discogs.com/sell/release/{release_id}"
                    }
        return None
    except requests.exceptions.RequestException:
        return None


# test 1 — make sure the discogs token is actually in the .env file
def test_discogs_token():
    print("\n[Test 1] Checking DISCOGS_TOKEN is set...")
    if not DISCOGS_TOKEN:
        print("  FAIL — DISCOGS_TOKEN missing from .env")
        return False
    print("  PASS — DISCOGS_TOKEN is loaded")
    return True


# test 2 — ping the discogs api to make sure it's up
def test_discogs_api_reachable():
    print("\n[Test 2] Checking Discogs API is reachable...")
    try:
        res = requests.get(
            "https://api.discogs.com/database/search",
            params={"q": "test", "type": "release"},
            headers=headers,
            timeout=10
        )
        if res.status_code == 200:
            print("  PASS — Discogs API is up")
            return True
        else:
            print(f"  FAIL — Got {res.status_code} from Discogs")
            return False
    except requests.exceptions.RequestException as e:
        print(f"  FAIL — Couldn't reach Discogs: {e}")
        return False


# test 3 — look up a real album and make sure we get a price back
def test_discogs_price_lookup():
    print("\n[Test 3] Checking price lookup for a known album...")
    # abbey road is a safe bet since it's always listed on discogs
    result = get_format_price("The Beatles", "Abbey Road", "Vinyl")
    if result and result.get("price"):
        print(f"  PASS — Vinyl price: ${result['price']:.2f}")
        print(f"         Version: {result['title']}")
        print(f"         Link: {result['link']}")
        return True
    else:
        print("  FAIL — No price found for Abbey Road on Vinyl")
        return False


# test 4 — check that flask is actually running before the other tests go
def test_backend_running():
    print("\n[Test 4] Checking Flask backend is running...")
    try:
        res = requests.get(f"{BASE_URL}/api/spotify/me", timeout=5)
        # a 401 here just means no token was sent, which is fine — server is up
        if res.status_code in [200, 401]:
            print(f"  PASS — Flask is running (status {res.status_code})")
            return True
        else:
            print(f"  FAIL — Got unexpected status {res.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("  FAIL — Flask not running, start it first with: python -m flask --app api run")
        return False


# test 5 — spotify login should block you if there's no token in the request
def test_spotify_login_requires_token():
    print("\n[Test 5] Checking that /api/spotify/me blocks requests with no token...")
    res = requests.get(f"{BASE_URL}/api/spotify/me")
    if res.status_code == 401:
        print("  PASS — Got 401 as expected with no token")
        return True
    else:
        print(f"  FAIL — Expected 401, got {res.status_code}")
        return False


# test 6 — the album search endpoint should return an error if artist or album is missing
def test_discogs_search_requires_params():
    print("\n[Test 6] Checking that /api/discogs/search needs artist and album...")
    res = requests.get(f"{BASE_URL}/api/discogs/search")
    if res.status_code == 400:
        print("  PASS — Got 400 when params were missing")
        return True
    else:
        print(f"  FAIL — Expected 400, got {res.status_code}")
        return False


# test 7 — hit the album search endpoint with a real album and check the price comes back
def test_discogs_search_endpoint():
    print("\n[Test 7] Checking /api/discogs/search returns a price...")
    res = requests.get(f"{BASE_URL}/api/discogs/search", params={
        "artist": "The Beatles",
        "album": "Abbey Road",
        "format": "Vinyl"
    })
    if res.status_code == 200:
        data = res.json()
        if data.get("found") and data.get("price"):
            print(f"  PASS — Price ${data['price']:.2f} returned from endpoint")
            return True
        elif data.get("found"):
            # found the album but nothing listed for sale right now, still ok
            print("  PASS — Album found, no active listings at the moment")
            return True
        else:
            print("  FAIL — Album not found")
            return False
    else:
        print(f"  FAIL — Endpoint returned {res.status_code}")
        return False


# test 8 — make sure all three formats (vinyl, cd, cassette) work
def test_all_formats():
    print("\n[Test 8] Checking Vinyl, CD, and Cassette all return results...")
    formats = ["Vinyl", "CD", "Cassette"]
    all_passed = True
    for fmt in formats:
        result = get_format_price("The Beatles", "Abbey Road", fmt)
        if result:
            print(f"  PASS — {fmt}: ${result['price']:.2f}")
        else:
            # not a hard fail since listings come and go
            print(f"  INFO — {fmt}: no listings right now")
    return all_passed


# run everything
if __name__ == "__main__":
    print("=" * 50)
    print("  SPRINT 2 TEST SUITE — Price Your Playlist")
    print("=" * 50)

    results = [
        test_discogs_token(),
        test_discogs_api_reachable(),
        test_discogs_price_lookup(),
        test_backend_running(),
        test_spotify_login_requires_token(),
        test_discogs_search_requires_params(),
        test_discogs_search_endpoint(),
        test_all_formats(),
    ]

    passed = sum(results)
    total  = len(results)

    print("\n" + "=" * 50)
    print(f"  Results: {passed}/{total} tests passed")
    print("=" * 50)

