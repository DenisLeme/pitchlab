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

const allowedOrigins =
  process.env.APP_ORIGIN?.split(',').map(s => s.trim()) ??
  ['http://localhost:3000', 'http://127.0.0.1:3000']

// 1) CORS PRIMEIRO (antes de helmet e das rotas)
const corsOpts = {
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'], // (case-insensitive)
}
app.use(cors(corsOpts))
app.options('*', cors(corsOpts)) // responde todos os preflights

// 2) JSON parser
app.use(express.json())

// 3) Helmet depois do CORS (evita interação estranha em dev)
app.use(helmet({ crossOriginResourcePolicy: false }))

// 4) Logs
app.use(pinoHttp({ logger }))

// (debug opcional)
// app.use((req, _res, next) => { console.log('IN', req.method, req.path, 'Origin:', req.headers.origin); next(); })

app.get('/health', (_req, res) => res.json({ ok: true }))

app.use('/rooms', roomsRouter)
app.use('/rooms', messagesRouter)
app.use('/', ideasRouter)
app.use('/ai', aiRouter)
app.use('/', tagsRouter)

// Socket.IO com CORS alinhado
const io = new Server(server, {
  cors: { origin: allowedOrigins, methods: ['GET', 'POST'], credentials: true },
})
registerSocketHandlers(io)

export const prisma = new PrismaClient()

const port = Number(process.env.PORT || 4000)
server.listen(port, () => {
  logger.info({ port, APP_ORIGIN: allowedOrigins }, 'API listening')
})
