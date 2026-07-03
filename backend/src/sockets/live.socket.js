export function registerLiveSocket(io) {
  io.on('connection', (socket) => {
    const { fightId, competitionId, mat } = socket.handshake.query || {};

    // Room-based joining for targeted events
    if (fightId) {
      socket.join(`fight:${fightId}`);
    }
    if (competitionId) {
      socket.join(`competition:${competitionId}`);
    }
    if (mat) {
      socket.join(`mat:${mat}`);
    }

    // Explicit room management from client
    socket.on('scoring:join', ({ fightId }) => {
      if (fightId) {
        socket.join(`fight:${fightId}`);
      }
    });

    socket.on('scoring:leave', ({ fightId }) => {
      if (fightId) {
        socket.leave(`fight:${fightId}`);
      }
    });

    socket.on('join:competition', (compId) => {
      if (compId) {
        socket.join(`competition:${compId}`);
      }
    });

    socket.on('leave:competition', (compId) => {
      if (compId) {
        socket.leave(`competition:${compId}`);
      }
    });

    socket.on('join:mat', (matName) => {
      if (matName) {
        socket.join(`mat:${matName}`);
      }
    });

    socket.on('leave:mat', (matName) => {
      if (matName) {
        socket.leave(`mat:${matName}`);
      }
    });

    // Lightweight fight score updates (client-to-client relay)
    socket.on('score:update', (data) => {
      if (data.fightId) {
        io.to(`fight:${data.fightId}`).emit('scoreUpdate', data);
      }
    });

    // Timer sync from client
    socket.on('timer:update', (data) => {
      if (data.fightId) {
        io.to(`fight:${data.fightId}`).emit('timerUpdate', data);
      }
      if (data.mat) {
        io.to(`mat:${data.mat}`).emit('timerUpdate', data);
      }
    });

    // Dashboard-wide live pulse
    socket.on('dashboard:subscribe', () => {
      socket.join('dashboard');
    });

    socket.on('dashboard:unsubscribe', () => {
      socket.leave('dashboard');
    });

    socket.on('disconnect', () => {
      // Cleanup is automatic with Socket.IO
    });
  });
}
