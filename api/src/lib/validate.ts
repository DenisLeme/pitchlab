import { z } from 'zod'

export const createRoomSchema = z.object({
  name: z.string().min(1).max(80)
})

export const createMessageSchema = z.object({
  authorName: z.string().min(1).max(60),
  content: z.string().min(1).max(1000),
  triggerAI: z.boolean().optional()
})

export const paginationSchema = z.object({
  limit: z.coerce.number().min(1).max(50).default(20),
  cursor: z.string().nullish()
})

export const createIdeaSchema = z.object({
  content: z.string().min(1).max(500),
  messageId: z.string().optional()
})

export const voteSchema = z.object({
  value: z.number().int().min(1).max(1).default(1)
})
