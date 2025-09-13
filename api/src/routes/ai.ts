import rateLimit from 'express-rate-limit'
import { Router } from 'express'
import { prisma } from '../index.js'
import { runGroq } from '../ai/groq.js'
import type { Server } from 'socket.io'
import { getIO } from '../sockets/handlers.js'

export const aiLimiter = rateLimit({
  windowMs: 60_000,
  max: 15
})

export async function maybeRunAI(roomId: string) {
  const messages = await prisma.message.findMany({ where: { roomId }, orderBy: { createdAt: 'desc' }, take: 20 })
  const text = messages.reverse().map(m => (m.role === 'assistant' ? `ASSISTENTE: ${m.content}` : `USUÁRIO: ${m.content}`)).join('\n')
  const { summary, tags, pitch } = await runGroq(text)
  // Persist tags
  if (Array.isArray(tags)) {
    for (const t of tags) {
      const tag = await prisma.tag.upsert({
        where: { name: String(t).toLowerCase() },
        update: {},
        create: { name: String(t).toLowerCase() }
      })
      // Link last user message to tag (if exists)
      const lastUser = await prisma.message.findFirst({ where: { roomId, role: 'user' }, orderBy: { createdAt: 'desc' } })
      if (lastUser) {
        await prisma.messageTag.upsert({
          where: { messageId_tagId: { messageId: lastUser.id, tagId: tag.id } },
          update: {},
          create: { messageId: lastUser.id, tagId: tag.id }
        })
      }
    }
  }
  const assistantMsgs = [
    { content: `Resumo:\n${summary}` },
    { content: `Tags sugeridas: ${tags.join(', ')}` },
    { content: `Pitch:\n${pitch}` }
  ]
  for (const m of assistantMsgs) {
    const created = await prisma.message.create({ data: { content: m.content, role: 'assistant', roomId } })
    const io: Server = getIO()
    io.to(roomId).emit('new_summary', created)
  }
}

const router = Router()

router.post('/summary', aiLimiter, async (req, res) => {
  const { roomId } = req.body || {}
  if (!roomId) return res.status(400).json({ error: 'roomId required' })
  await maybeRunAI(roomId)
  res.json({ ok: true })
})

router.post('/tags', aiLimiter, async (req, res) => {
  const { roomId } = req.body || {}
  if (!roomId) return res.status(400).json({ error: 'roomId required' })
  await maybeRunAI(roomId)
  res.json({ ok: true })
})

router.post('/pitch', aiLimiter, async (req, res) => {
  const { roomId } = req.body || {}
  if (!roomId) return res.status(400).json({ error: 'roomId required' })
  await maybeRunAI(roomId)
  res.json({ ok: true })
})

export default router
