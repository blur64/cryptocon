// const portMessagesTypes = {
//   SOCKET_INIT: 'SOCKET_INIT',

// };

let socket = null;
const ports = [];

function socketMessageHandler(message) {
  ports.forEach(p => p.postMessage(message));
}

function portMessageHandler(message) {
  if (message.WSUrl) {
    if (!socket) {
      socket = new WebSocket(message.WSUrl);
    }
  }

  if (!socket.onmessage) {
    socket.onmessage = (e) =>
      socketMessageHandler(JSON.parse(e.data));
  }

  if (message.WSMessage) {
    const stringifiedMessage = JSON.stringify(message.WSMessage);

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