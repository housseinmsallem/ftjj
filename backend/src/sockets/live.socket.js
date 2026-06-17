export function registerLiveSocket(io) {
  io.on('connection', (socket) => {
    socket.on('scoring:join', ({ fightId }) => { if (fightId) socket.join(`fight:${fightId}`); });
    socket.on('scoring:leave', ({ fightId }) => { if (fightId) socket.leave(`fight:${fightId}`); });
    socket.on('join:match', (id) => socket.join(`match:${id}`));
    socket.on('disconnect', () => {});
  });
}
