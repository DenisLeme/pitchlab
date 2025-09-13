import { Router } from 'express'
import { prisma } from '../index.js'
import { createMessageSchema, paginationSchema } from '../lib/validate.js'
import type { Server } from 'socket.io'
import { getIO } from '../sockets/handlers.js'
import { maybeRunAI } from './ai.js'

const router = Router()

router.get('/:roomId/messages', async (req, res) => {
  const { roomId } = req.params
  const room = await prisma.room.findUnique({ where: { id: roomId } })
  if (!room) return res.status(404).json({ error: 'Room not found' })
  const parsed = paginationSchema.parse(req.query)
  const where = { roomId }
  const messages = await prisma.message.findMany({
    where,
    take: parsed.limit,
    ...(parsed.cursor ? { skip: 1, cursor: { id: parsed.cursor } } : {}),
    orderBy: { createdAt: 'desc' }
  })
  const nextCursor = messages.length === parsed.limit ? messages[messages.length - 1].id : null
  res.json({ items: messages.reverse(), nextCursor })
})

router.post('/:roomId/messages', async (req, res) => {
  const { roomId } = req.params
  const room = await prisma.room.findUnique({ where: { id: roomId } })
  if (!room) return res.status(404).json({ error: 'Room not found' })

  const parsed = createMessageSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json(parsed.error.format())

  const user = await prisma.user.create({ data: { name: parsed.data.authorName } })
  const msg = await prisma.message.create({
    data: { content: parsed.data.content, roomId, userId: user.id, role: 'user' }
  })

  const io: Server = getIO()
  io.to(roomId).emit('new_message', msg)

  res.status(201).json(msg)

  if (parsed.data.triggerAI) {
    await maybeRunAI(roomId)
  }
})

export default router
