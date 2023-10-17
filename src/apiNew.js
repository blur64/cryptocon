function listenTickersMessages(onMessage) {
  myWorker.port.addEventListener(
    'message',
    (e) => onMessage(e.data)
  );
}

