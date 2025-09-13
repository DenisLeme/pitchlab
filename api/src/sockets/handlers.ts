import type { Server } from 'socket.io'

let ioRef: Server

export function registerSocketHandlers(io: Server) {
  ioRef = io
  io.on('connection', (socket) => {
    socket.on('join_room', ({ roomId, name }) => {
      socket.join(roomId)
      socket.to(roomId).emit('typing', { name, typing: false })
    })
    socket.on('typing', ({ roomId, name, typing }) => {
      socket.to(roomId).emit('typing', { name, typing })
    })
  })
}

export function getIO(): Server {
  if (!ioRef) throw new Error('IO not ready')
  return ioRef
}
