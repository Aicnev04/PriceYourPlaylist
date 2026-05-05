# Price Your Playlist

Find out where you can buy the songs in your Spotify playlists — digitally or as physical copies.

---

## Prerequisites

Make sure you have these installed before starting:

- [Node.js](https://nodejs.org/) v18 or higher — `node -v` to check
- [Python](https://www.python.org/) v3.10 or higher — `python3 --version` to check
- [ngrok](https://ngrok.com/) — needed to expose your local server to Spotify's auth

To install ngrok:
```bash
brew install ngrok
```

---

## One-time setup

### 1. Clone the repo and install dependencies

```bash
git clone <repo-url>
cd PriceYourPlaylist
npm install
```

For the Python backend, create a virtual environment inside the `api/` folder:

```bash
python3 -m venv api/.venv
source api/.venv/bin/activate      # macOS/Linux
# api\.venv\Scripts\activate       # Windows

pip install -r api/requirements.txt
```

### 2. Set up ngrok

Sign up for a free account at [ngrok.com](https://ngrok.com), then link your machine:

```bash
ngrok config add-authtoken YOUR_NGROK_TOKEN
```

### 3. Set up your Spotify app

1. Go to [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard) and create an app
2. Check **Web API** when asked which API you're using
3. Copy your **Client ID**
4. Leave the redirect URI blank for now — you'll fill it in after starting ngrok (step 4 below)

### 4. Create your `.env` file

Create a file called `.env` in the project root (same folder as `package.json`):

```
VITE_SPOTIFY_CLIENT_ID=your_client_id_here
VITE_REDIRECT_URI=https://your-ngrok-url.ngrok-free.app/callback
```

You'll get the ngrok URL in the next section. Keep this file — never commit it to git.

---

## Running the app (every session)

You need **three terminals** open, all from the project root.

### Terminal 1 — ngrok tunnel
```bash
ngrok http 5173
```

Copy the `https://` forwarding URL it gives you (e.g. `https://abc123.ngrok-free.app`).

Then:
- Go to your Spotify app settings at [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard)
- Set the redirect URI to: `https://your-ngrok-url.ngrok-free.app/callback`
- Hit **Save**
- Update `VITE_REDIRECT_URI` in your `.env` to match

> **Note:** On the free ngrok plan, this URL changes every time you restart ngrok. You'll need to update your Spotify dashboard and `.env` each session.

### Terminal 2 — Frontend
```bash
npm run dev
```

### Terminal 3 — Backend
```bash
npm run api
```

Once all three are running, open the **`https://` URL from the ngrok terminal** (not localhost) in your browser. You should see the login page.

---

## Troubleshooting

| Error | Fix |
|---|---|
| `redirect_uri: Insecure` | Spotify no longer allows localhost — make sure you're using the ngrok URL |
| `redirect_uri: Not matching configuration` | The URL in `.env` doesn't exactly match what's saved in your Spotify dashboard |
| `ERR_NGROK_3004` | Your Vite server isn't running — start `npm run dev` first |
| Blank page after login | Make sure you restarted `npm run dev` after editing `.env` |
| Error running npm run api | Ensure the api path under scripts in package.json aligns with your venv path (everyone's is different cause of different systems) |
