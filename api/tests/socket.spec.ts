import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createServer } from 'http'
import { Server } from 'socket.io'
import Client from 'socket.io-client'

describe('socket', () => {
  let io: Server
  let httpServer: any
  let clientSocket: any

  beforeAll(async () => {
    httpServer = createServer()
    io = new Server(httpServer)
    await new Promise<void>(resolve => httpServer.listen(() => resolve()))
  })

  afterAll(() => {
    io.close()
    httpServer.close()
    clientSocket?.close()
  })

  it('broadcasts messages', async () => {
    const addr = httpServer.address()
    const url = `http://localhost:${addr.port}`
    clientSocket = Client(url)
    await new Promise(res => clientSocket.on('connect', res))

    await new Promise<void>((resolve) => {
      io.on('connection', (socket) => {
        socket.on('join_room', ({ roomId }) => {
          socket.join(roomId)
          io.to(roomId).emit('new_message', { id: '1', content: 'hello' })
        })
      })
      clientSocket.on('new_message', (m: any) => {
        expect(m.content).toBe('hello')
        resolve()
      })
      clientSocket.emit('join_room', { roomId: 'test' })
    })
  })
})
