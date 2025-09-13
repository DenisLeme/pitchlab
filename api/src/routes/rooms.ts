import { Router } from 'express'
import { prisma } from '../index.js'
import { createRoomSchema } from '../lib/validate.js'

const router = Router()

router.get('/', async (_req, res) => {
  const rooms = await prisma.room.findMany({ orderBy: { createdAt: 'desc' } })
  res.json(rooms)
})

router.post('/', async (req, res) => {
  const parsed = createRoomSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json(parsed.error.format())
  const room = await prisma.room.create({ data: { name: parsed.data.name } })
  res.status(201).json(room)
})

router.post('/:roomId/join', async (req, res) => {
  // apenas para simetria/futuro; no momento não persiste participação
  const { roomId } = req.params
  const room = await prisma.room.findUnique({ where: { id: roomId } })
  if (!room) return res.status(404).json({ error: 'Room not found' })
  res.json({ ok: true })
})

export default router
