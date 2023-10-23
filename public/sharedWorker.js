const portMessagesTypes = {
  SOCKET_INIT: 'SOCKET_INIT',
  SOCKET_MESSAGE: 'SOCKET_MESSAGE',
};

let socket = null;
const ports = [];

function socketMessageHandler(message) {
  ports.forEach(p => p.postMessage(message));
}

function portMessageHandler(message) {
  if (message.type === portMessagesTypes.SOCKET_INIT) {
    if (!socket) {
      socket = new WebSocket(message.text);
    }
  }

  if (!socket.onmessage) {
    socket.onmessage = (e) =>
      socketMessageHandler(JSON.parse(e.data));
  }

  if (message.type === portMessagesTypes.SOCKET_MESSAGE) {
    const stringifiedMessage = JSON.stringify(message.text);

    if (socket.readyState === WebSocket.OPEN) {
      socket.send(stringifiedMessage);
    } else {
      socket.addEventListener('open', () => {
        socket.send(stringifiedMessage);
      }, { once: true });
    }
  }
}

self.addEventListener('connect', (e) => {
  const newPort = e.ports[0]
  ports.push(newPort);
  newPort.addEventListener('message', (e) =>
    portMessageHandler(e.data));
  newPort.start();
});