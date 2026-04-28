const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID
const REDIRECT_URI = import.meta.env.VITE_REDIRECT_URI || 'https://localhost:5173/callback'

// Include playlist scopes now so we don't need to re-auth later
const SCOPES = 'user-read-private user-read-email playlist-read-private playlist-read-collaborative'

function generateRandomString(length) {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const values = crypto.getRandomValues(new Uint8Array(length))
  return values.reduce((acc, x) => acc + possible[x % possible.length], '')
}

async function sha256(plain) {
  const data = new TextEncoder().encode(plain)
  return window.crypto.subtle.digest('SHA-256', data)
}

function base64encode(input) {
  return btoa(String.fromCharCode(...new Uint8Array(input)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

export async function redirectToSpotify() {
  const codeVerifier = generateRandomString(64)
  const codeChallenge = base64encode(await sha256(codeVerifier))

  localStorage.setItem('spotify_code_verifier', codeVerifier)

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    scope: SCOPES,
    redirect_uri: REDIRECT_URI,
    code_challenge_method: 'S256',
    code_challenge: codeChallenge,
  })

  window.location.href = `https://accounts.spotify.com/authorize?${params}`
}

export async function exchangeCodeForToken(code) {
  const codeVerifier = localStorage.getItem('spotify_code_verifier')

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      client_id: CLIENT_ID,
      code_verifier: codeVerifier,
    }),
  })

  if (!response.ok) throw new Error('Token exchange failed')

  const data = await response.json()
  localStorage.setItem('spotify_access_token', data.access_token)
  localStorage.setItem('spotify_refresh_token', data.refresh_token)
  localStorage.setItem('spotify_token_expiry', Date.now() + data.expires_in * 1000)
  localStorage.removeItem('spotify_code_verifier')
  return data
}

export function getAccessToken() {
  return localStorage.getItem('spotify_access_token')
}

export function isTokenValid() {
  const token = localStorage.getItem('spotify_access_token')
  const expiry = localStorage.getItem('spotify_token_expiry')
  if (!token || !expiry) return false
  return Date.now() < parseInt(expiry)
}

export function logout() {
  localStorage.removeItem('spotify_access_token')
  localStorage.removeItem('spotify_refresh_token')
  localStorage.removeItem('spotify_token_expiry')
}
