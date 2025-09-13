'use client'
import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'

const API = process.env.NEXT_PUBLIC_API_URL!

export default function RoomPage({ params }: { params: { id: string } }) {
  const roomId = params.id
  const [socket, setSocket] = useState<Socket | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [ideas, setIdeas] = useState<any[]>([])
  const [tags, setTags] = useState<any[]>([])
  const [content, setContent] = useState('')
  const [author, setAuthor] = useState('Convidado')
  const bottomRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const s = io(API, { transports: ['websocket'] })
    setSocket(s)
    s.emit('join_room', { roomId, name: author })
    return () => { s.disconnect() }
  }, [roomId])

  const fetchMessages = async () => {
    const r = await fetch(`${API}/rooms/${roomId}/messages?limit=50`)
    const j = await r.json()
    setMessages(j.items || [])
  }

  useEffect(() => { fetchMessages(); fetchTags() }, [roomId])

  useEffect(() => {
    if (!socket) return
    socket.on('new_message', (m) => setMessages((prev) => [...prev, m]))
    socket.on('new_summary', (m) => setMessages((prev) => [...prev, m]))
    socket.on('new_idea', (i) => setIdeas((prev) => [i, ...prev]))
    socket.on('vote_idea', (i) => setIdeas((prev) => prev.map(x => x.id === i.id ? i : x)))
    return () => {
      socket.off('new_message')
      socket.off('new_summary')
      socket.off('new_idea')
      socket.off('vote_idea')
    }
  }, [socket])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const send = async (triggerAI?: boolean) => {
    if (!content.trim()) return
    await fetch(`${API}/rooms/${roomId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authorName: author || 'Convidado', content, triggerAI })
    })
    setContent('')
  }

  const createIdea = async () => {
    if (!content.trim()) return
    const r = await fetch(`${API}/rooms/${roomId}/ideas`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    })
    const j = await r.json()
    setIdeas((prev) => [j, ...prev])
    setContent('')
  }

  const vote = async (id: string) => {
    await fetch(`${API}/ideas/${id}/vote`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ value: 1 }) })
  }

  const fetchTags = async () => {
    const r = await fetch(`${API}/rooms/${roomId}/tags`)
    const j = await r.json()
    setTags(j)
  }

  const runAI = async (kind: 'summary'|'tags'|'pitch') => {
    await fetch(`${API}/ai/${kind}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ roomId }) })
  }

  return (
    <main className="max-w-5xl mx-auto p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
      <section className="md:col-span-2 bg-white rounded border p-4 flex flex-col h-[80vh]">
        <div className="flex items-center gap-2 pb-3 border-b">
          <input className="border rounded px-2 py-1" value={author} onChange={e => setAuthor(e.target.value)} />
          <button onClick={() => runAI('summary')} className="ml-auto px-3 py-1 rounded bg-neutral-900 text-white">Resumo IA</button>
          <button onClick={() => runAI('tags')} className="px-3 py-1 rounded bg-neutral-900 text-white">Tags IA</button>
          <button onClick={() => runAI('pitch')} className="px-3 py-1 rounded bg-neutral-900 text-white">Pitch IA</button>
        </div>
        <div className="flex-1 overflow-auto space-y-3 py-3">
          {messages.map(m => (
            <div key={m.id} className={`p-3 rounded ${m.role === 'assistant' ? 'bg-blue-50' : 'bg-neutral-100'}`}>
              <div className="text-xs text-neutral-500">{new Date(m.createdAt).toLocaleTimeString()} • {m.role}</div>
              <div className="whitespace-pre-wrap">{m.content}</div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
        <div className="flex gap-2 pt-3 border-t">
          <input className="border rounded px-3 py-2 flex-1" placeholder="Escreva uma mensagem..."
            value={content} onChange={e => setContent(e.target.value)} />
          <button className="px-3 py-2 rounded bg-black text-white" onClick={() => send(false)}>Enviar</button>
          <button className="px-3 py-2 rounded bg-neutral-800 text-white" onClick={() => send(true)}>Enviar + IA</button>
          <button className="px-3 py-2 rounded bg-emerald-600 text-white" onClick={createIdea}>Criar Ideia</button>
        </div>
      </section>

      <aside className="bg-white rounded border p-4 h-[80vh] overflow-auto">
        <h2 className="font-semibold mb-3">Ideias</h2>
        <ul className="space-y-2">
          {ideas.map(i => (
            <li key={i.id} className="p-3 rounded border flex items-center justify-between">
              <div className="whitespace-pre-wrap">{i.content}</div>
              <button onClick={() => vote(i.id)} className="px-2 py-1 rounded bg-neutral-900 text-white">+ {i.score}</button>
            </li>
          ))}
        </ul>
      <div className="mt-6">
          <h2 className="font-semibold mb-2">Tags</h2>
          <div className="flex flex-wrap gap-2">
            {tags.map((t:any) => (
              <span key={t.id} className="px-2 py-1 text-sm rounded-full border bg-neutral-50">
                {t.name} ({t.uses})
              </span>
            ))}
          </div>
        </div>
      </aside>
    </main>
  )
}
