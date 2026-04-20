import { useState, useEffect } from 'react'
import './App.css'

const API = import.meta.env.VITE_API_URL || ''

function App() {
  const [message, setMessage] = useState('');
  const [time, setTime] = useState(0);

  useEffect(() => {
    fetch(`${API}/api/info`).then(res => res.json()).then(data => {
      setMessage(data.message);
    });
  }, []);

  useEffect(() => {
    fetch(`${API}/api/time`).then(res => res.json()).then(data => {
      setTime(data.time);
    });
  }, []);

  return (
    <>
      <section id="center">
        <p>{message}</p>
        <p>The current time is {new Date(time * 1000).toLocaleString()}.</p>
      </section>
    </>
  )
}

export default App