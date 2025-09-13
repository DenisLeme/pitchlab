'use client'
import { useEffect, useState } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL;
console.log('API URL:', API);

export default function Home() {
  const [rooms, setRooms] = useState<any[]>([])
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  const fetchRooms = async () => {
    const url = `${API}/rooms`;
    console.log('GET', url);
    try {
      const r = await fetch(url, { mode: 'cors' });
      console.log('status', r.status);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      setRooms(j);
    } catch (e) {
      console.error('fetchRooms error', e);
    }
  };

  useEffect(() => { fetchRooms() }, [])

  const createRoom = async () => {
    if (!name.trim()) return
    setLoading(true)
    try {
      const url = `${API}/rooms`
      console.log('POST', url, { name })
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      console.log('POST status', r.status)
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      setName('')
      await fetchRooms()
    } catch (e) {
      console.error('createRoom error:', e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">PitchLab</h1>
      <div className="flex gap-2">
        <input className="border rounded px-3 py-2 flex-1" placeholder="Nome da sala"
          value={name} onChange={e => setName(e.target.value)} />
        <button className="px-4 py-2 rounded bg-black text-white disabled:opacity-50" disabled={loading} onClick={createRoom}>
          Criar
        </button>
      </div>
      <ul className="divide-y rounded border bg-white">
        {rooms.map(r => (
          <li key={r.id} className="p-4 flex items-center justify-between">
            <div>
              <div className="font-semibold">{r.name}</div>
              <div className="text-sm text-neutral-500">{new Date(r.createdAt).toLocaleString()}</div>
            </div>
            <a href={`/rooms/${r.id}`} className="px-3 py-2 rounded bg-neutral-900 text-white">Entrar</a>
          </li>
        ))}
      </ul>
    </main>
  )
}
