import { useEffect, useState } from 'react'
import { getAccessToken, logout } from './spotify-auth'
import './HomePage.css'

function HomePage() {
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    fetch('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${getAccessToken()}` },
    })
      .then(res => res.json())
      .then(data => setProfile(data))
  }, [])

  function handleLogout() {
    logout()
    window.location.href = '/'
  }

  if (!profile) return null

  const avatar = profile.images?.[0]?.url

  return (
    <div className="home-page">
      <div className="home-container">
        {avatar
          ? <img className="home-avatar" src={avatar} alt={profile.display_name} />
          : <div className="home-avatar home-avatar--placeholder">{profile.display_name?.[0]}</div>
        }
        <h1 className="home-name">{profile.display_name}</h1>
        <button className="home-logout" onClick={handleLogout}>Log out</button>
      </div>
    </div>
  )
}

export default HomePage
