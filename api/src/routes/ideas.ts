import { Router } from 'express'
import { prisma } from '../index.js'
import { createIdeaSchema, voteSchema } from '../lib/validate.js'
import type { Server } from 'socket.io'
import { getIO } from '../sockets/handlers.js'

const router = Router()

router.post('/rooms/:roomId/ideas', async (req, res) => {
  const { roomId } = req.params
  const room = await prisma.room.findUnique({ where: { id: roomId } })
  if (!room) return res.status(404).json({ error: 'Room not found' })
  const parsed = createIdeaSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json(parsed.error.format())
  const idea = await prisma.idea.create({
    data: { content: parsed.data.content, roomId }
  })
  const io: Server = getIO()
  io.to(roomId).emit('new_idea', idea)
  res.status(201).json(idea)
})

router.post('/ideas/:ideaId/vote', async (req, res) => {
  const { ideaId } = req.params
  const parsed = voteSchema.safeParse(req.body || { value: 1 })
  if (!parsed.success) return res.status(400).json(parsed.error.format())
  const idea = await prisma.idea.findUnique({ where: { id: ideaId } })
  if (!idea) return res.status(404).json({ error: 'Idea not found' })
  await prisma.idea.update({ where: { id: ideaId }, data: { score: { increment: parsed.data.value } } })
  const updated = await prisma.idea.findUnique({ where: { id: ideaId } })
  const io: Server = getIO()
  io.to(updated!.roomId).emit('vote_idea', updated)
  res.json(updated)
})

export default router
