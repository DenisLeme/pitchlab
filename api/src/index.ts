import 'dotenv/config'
import express from 'express'
import http from 'http'
import cors from 'cors'
import helmet from 'helmet'
import { Server } from 'socket.io'
import pinoHttp from 'pino-http'
import pino from 'pino'
import { PrismaClient } from '@prisma/client'
import roomsRouter from './routes/rooms.js'
import messagesRouter from './routes/messages.js'
import ideasRouter from './routes/ideas.js'
import aiRouter from './routes/ai.js'
import tagsRouter from './routes/tags.js'
import { registerSocketHandlers } from './sockets/handlers.js'

const logger = pino({ level: process.env.LOG_LEVEL || 'info' })
const app = express()
const server = http.createServer(app)
const io = new Server(server, {
  cors: { origin: process.env.APP_ORIGIN, methods: ['GET','POST'] }
})
export const prisma = new PrismaClient()

app.use(express.json())
app.use(helmet())
app.use(cors({ origin: process.env.APP_ORIGIN, credentials: true }))
app.use(pinoHttp({ logger }))

app.get('/health', (_req, res) => res.json({ ok: true }))

app.use('/rooms', roomsRouter)
app.use('/rooms', messagesRouter) // nested under /rooms/:roomId
app.use('/', ideasRouter)
app.use('/ai', aiRouter)
app.use('/', tagsRouter)

registerSocketHandlers(io)

const port = Number(process.env.PORT || 4000)
server.listen(port, () => {
  logger.info({ port }, 'API listening')
})
