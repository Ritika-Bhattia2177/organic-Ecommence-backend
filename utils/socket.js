let ioInstance = null;

const setIo = (io) => {
  ioInstance = io;
  return ioInstance;
};

const getIo = () => ioInstance;

const emitLocationReceive = (payload) => {
  if (!ioInstance) {
    return;
  }

  ioInstance.emit('location:receive', payload);
};

const registerSocketHandlers = (socket) => {
  socket.on('location:update', (payload) => {
    emitLocationReceive({
      ...payload,
      source: 'socket',
      receivedAt: new Date().toISOString(),
    });
  });
};

module.exports = {
  setIo,
  getIo,
  emitLocationReceive,
  registerSocketHandlers,
};