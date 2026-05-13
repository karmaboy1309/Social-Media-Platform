const socketIO = require('socket.io');

let io;
const userSockets = new Map(); // Maps userId -> socketId

module.exports = {
  init: (httpServer) => {
    io = socketIO(httpServer, {
      cors: {
        origin: '*', // For development
        methods: ['GET', 'POST', 'PUT', 'DELETE']
      }
    });

    io.on('connection', (socket) => {
      console.log('🔗 Client connected:', socket.id);

      socket.on('register', (userId) => {
        if (!userId) return;
        userSockets.set(userId.toString(), socket.id);
        socket.join(userId.toString()); // Also join a room for the user
        console.log(`👤 User ${userId} registered with socket ${socket.id}`);
      });

      socket.on('disconnect', () => {
        for (const [userId, socketId] of userSockets.entries()) {
          if (socketId === socket.id) {
            userSockets.delete(userId);
            break;
          }
        }
        console.log('🔌 Client disconnected:', socket.id);
      });
    });

    return io;
  },

  getIO: () => {
    if (!io) {
      throw new Error('Socket.io is not initialized!');
    }
    return io;
  },

  getSocketId: (userId) => {
    return userSockets.get(userId.toString());
  }
};
