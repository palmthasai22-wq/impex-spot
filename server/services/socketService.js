const { Server } = require('socket.io');

let io = null;
let pinStore = null;

module.exports = {
  init(server) {
    io = new Server(server, { cors: { origin: process.env.CORS_ORIGIN || 'http://localhost:5173' } });
    io.on('connection', socket => {
      socket.emit('pins:initial', pinStore ? pinStore.list() : []);
    });
    return io;
  },
  setPinStore(store) { pinStore = store; },
  emit(event, payload) { io?.emit(event, payload); },
  get io() { return io; },
};
