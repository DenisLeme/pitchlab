import { Router } from 'express'
import { prisma } from '../index.js'

const router = Router()

// List tags for a room (aggregated from messages in the room)
router.get('/rooms/:roomId/tags', async (req, res) => {
  const { roomId } = req.params
  const tags = await prisma.$queryRawUnsafe<any[]>(`
    SELECT t.id, t.name, COUNT(mt."messageId") as uses
    FROM "Tag" t
    JOIN "MessageTag" mt ON mt."tagId" = t.id
    JOIN "Message" m ON m.id = mt."messageId"
    WHERE m."roomId" = $1
    GROUP BY t.id, t.name
    ORDER BY uses DESC, t.name ASC
  `, roomId)
  res.json(tags)
})

// List tags linked to a message
router.get('/messages/:messageId/tags', async (req, res) => {
  const { messageId } = req.params
  const list = await prisma.messageTag.findMany({
    where: { messageId },
    include: { tag: true }
  })
  res.json(list.map(x => x.tag))
})

export default router
